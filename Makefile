data_dir = data

# There are three env variables you will likely want to set when using this
# Makefile:
#  * DB: the name of the database to import data to
#  * DB_USER: the name of a database user that can write to the database
#  * DB_READONLY_USER: the name of a database user that can only read from the
#    database

download_epsg:
	mkdir -p $(data_dir)
	wget -P $(data_dir) http://www.epsg.org/Portals/0/EPSG%20files/v9-4/EPSG-PSQL-export-9.4.zip
	unzip $(data_dir)/EPSG-PSQL-export-9.4.zip -d $(data_dir)

download_epsg_polygons:
	mkdir -p $(data_dir)
	wget -P $(data_dir) http://www.epsg.org/polygons/EPSG_Polygons_Ver_9.2.1.zip
	unzip $(data_dir)/EPSG_Polygons_Ver_9.2.1.zip -d $(data_dir)

clear_epsg:
	psql $(DB) -U $(DB_USER) -w -t -c "select 'drop table if exists \"' || tablename || '\" cascade;' from pg_tables where schemaname = 'public'" -o "$(data_dir)/epsg_clear.sql"
	psql $(DB) -U $(DB_USER) -t < "$(data_dir)/epsg_clear.sql"

load_epsg:
	psql $(DB) -U $(DB_USER) < "$(data_dir)/PostgreSQL_Table_Script.sql"
	psql $(DB) -U $(DB_USER) < "$(data_dir)/PostgreSQL_Data_Script.sql"
	psql $(DB) -U $(DB_USER) < "$(data_dir)/PostgreSQL_FKey_Script.sql"
	psql $(DB) -U $(DB_USER) -c "GRANT SELECT ON ALL TABLES IN SCHEMA public TO $(DB_READONLY_USER)"

load_epsg_polygons:
	PGCLIENTENCODING=LATIN1 ogr2ogr -f "PostgreSQL" PG:"dbname=$(DB) user=$(DB_USER)" -nlt PROMOTE_TO_MULTI -overwrite $(data_dir)/EPSG_Polygons.shp -nln areas_of_use
	psql $(DB) -U $(DB_USER) -c "GRANT SELECT ON ALL TABLES IN SCHEMA public TO $(DB_READONLY_USER)"

add_simplified_geometry_column:
	psql $(DB) -U $(DB_USER) -c "ALTER TABLE areas_of_use ADD COLUMN wkb_geometry_simplified GEOMETRY(Geometry,4326)"
	psql $(DB) -U $(DB_USER) -c "CREATE INDEX ON areas_of_use USING GIST (wkb_geometry_simplified)"
	psql $(DB) -U $(DB_USER) -c "UPDATE areas_of_use SET wkb_geometry_simplified = ST_SimplifyPreserveTopology(wkb_geometry, 0.03)"

add_join_table:
	psql $(DB) -U $(DB_USER) -c "DROP TABLE IF EXISTS projestions_joined"
	psql $(DB) -U $(DB_USER) -c "CREATE TABLE projestions_joined AS SELECT a.wkb_geometry, ST_SimplifyPreserveTopology(wkb_geometry, 0.03) AS wkb_geometry_simplified, a.area_name, a.area_code, a.region, crs.coord_ref_sys_code, crs.coord_ref_sys_name, uom.unit_of_meas_name FROM areas_of_use a INNER JOIN epsg_coordinatereferencesystem crs ON crs.area_of_use_code = a.area_code INNER JOIN epsg_coordinatesystem cs ON cs.coord_sys_code = crs.coord_sys_code INNER JOIN epsg_coordinateaxis axis ON axis.coord_sys_code = cs.coord_sys_code INNER JOIN epsg_unitofmeasure uom ON uom.uom_code = axis.uom_code WHERE crs.deprecated = 0 AND cs.deprecated = 0 AND uom.deprecated = 0"
	psql $(DB) -U $(DB_USER) -c "GRANT SELECT ON ALL TABLES IN SCHEMA public TO $(DB_READONLY_USER)"

refresh_data: clear_epsg load_epsg load_epsg_polygons add_simplified_geometry_column add_join_table
