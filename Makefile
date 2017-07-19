DB = epsg
data_dir = data

download_epsg:
	mkdir -p $(data_dir)
	wget -P $(data_dir) http://www.epsg.org/Portals/0/EPSG%20files/v9-1/epsg-v9_1sql-PostgreSQL.zip
	unzip $(data_dir)/epsg-v9_1sql-PostgreSQL.zip -d $(data_dir)

clear_epsg:
	psql $(DB) -w -t -c "select 'drop table if exists \"' || tablename || '\" cascade;' from pg_tables where schemaname = 'public'" -o "$(data_dir)/epsg_clear.sql"
	psql $(DB) -t < "$(data_dir)/epsg_clear.sql"

load_epsg:
	psql $(DB) < "$(data_dir)/EPSG_v9_1.mdb_Tables_PostgreSQL.sql"
	echo "set client_encoding to 'latin1';" | cat - "$(data_dir)/EPSG_v9_1.mdb_Data_PostgreSQL.sql" | psql $(DB)
	psql $(DB) < "$(data_dir)/EPSG_v9_1.mdb_FKeys_PostgreSQL.sql"

download_epsg_polygons:
	mkdir -p $(data_dir)
	wget -P $(data_dir) http://www.epsg.org/polygons/EPSG_Polygons_Ver_9.1.zip
	unzip $(data_dir)/EPSG_Polygons_Ver_9.1.zip -d $(data_dir)

load_epsg_polygons:
	ogr2ogr -f "PostgreSQL" PG:"dbname=$(DB) user=projesstions" -nlt PROMOTE_TO_MULTI -overwrite $(data_dir)/EPSG_Polygons_test.shp -nln areas_of_use
