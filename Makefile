DB = epsg
data_dir = data

download_epsg:
	mkdir -p $(data_dir)
	wget -P $(data_dir) http://www.epsg.org/Portals/0/EPSG%20files/v9-1/epsg-v9_1sql-PostgreSQL.zip
	unzip $(data_dir)/epsg-v9_1sql-PostgreSQL.zip -d $(data_dir)

download_epsg_polygons:
	mkdir -p $(data_dir)
	wget -P $(data_dir) http://www.epsg.org/polygons/EPSG_Polygons_Ver_9.1.zip
	unzip $(data_dir)/EPSG_Polygons_Ver_9.1.zip -d $(data_dir)

clear_epsg:
	psql $(DB) -w -t -c "select 'drop table if exists \"' || tablename || '\" cascade;' from pg_tables where schemaname = 'public'" -o "$(data_dir)/epsg_clear.sql"
	psql $(DB) -t < "$(data_dir)/epsg_clear.sql"

load_epsg:
	psql $(DB) < "$(data_dir)/EPSG_v9_1.mdb_Tables_PostgreSQL.sql"
	echo "set client_encoding to 'latin1';" | cat - "$(data_dir)/EPSG_v9_1.mdb_Data_PostgreSQL.sql" | psql $(DB)
	psql $(DB) < "$(data_dir)/EPSG_v9_1.mdb_FKeys_PostgreSQL.sql"
	psql $(DB) -c "GRANT SELECT ON ALL TABLES IN SCHEMA public TO projestions_readonly"

load_epsg_polygons:
	ogr2ogr -f "PostgreSQL" PG:"dbname=$(DB)" -nlt PROMOTE_TO_MULTI -overwrite $(data_dir)/EPSG_Polygons.shp -nln areas_of_use
	psql $(DB) -c "GRANT SELECT ON ALL TABLES IN SCHEMA public TO projestions_readonly"

add_simplified_geometry_column:
	psql $(DB) -c "ALTER TABLE areas_of_use ADD COLUMN wkb_geometry_simplified GEOMETRY(MultiPolygon,4326)"
	psql $(DB) -c "CREATE INDEX ON areas_of_use USING GIST (wkb_geometry_simplified)"
	psql $(DB) -c "UPDATE areas_of_use SET wkb_geometry_simplified = ST_Simplify(wkb_geometry, 0.03)"

add_join_table:
	psql $(DB) -U projesstions -c "DROP TABLE projestions_joined"
	psql $(DB) -U projesstions -c "CREATE TABLE projestions_joined AS SELECT a.wkb_geometry, ST_Simplify(wkb_geometry, 0.03) AS wkb_geometry_simplified, a.area_name, a.area_code, a.region, crs.coord_ref_sys_code, crs.coord_ref_sys_name, uom.unit_of_meas_name FROM areas_of_use a INNER JOIN epsg_coordinatereferencesystem crs ON crs.area_of_use_code = a.area_code INNER JOIN epsg_coordinatesystem cs ON cs.coord_sys_code = crs.coord_sys_code INNER JOIN epsg_coordinateaxis axis ON axis.coord_sys_code = cs.coord_sys_code INNER JOIN epsg_unitofmeasure uom ON uom.uom_code = axis.uom_code WHERE crs.deprecated = 0 AND cs.deprecated = 0 AND uom.deprecated = 0"
	psql $(DB) -c "GRANT SELECT ON ALL TABLES IN SCHEMA public TO projestions_readonly"

refresh_data: clear_epsg load_epsg load_epsg_polygons add_simplified_geometry_column add_join_table
