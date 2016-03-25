DB = epsg
data_dir = data

download_epsg:
	mkdir -p $(data_dir)
	wget -P $(data_dir) http://www.epsg.org/Portals/0/EPSG%20files/v8-9/epsg-v8_9sql-PostgreSQL.zip
	unzip $(data_dir)/epsg-v8_9sql-PostgreSQL.zip -d $(data_dir)

load_epsg:
	psql $(DB) < "$(data_dir)/EPSG_v8_9.mdb_Tables_PostgreSQL.sql"
	echo "set client_encoding to 'latin1';" | cat - "$(data_dir)/EPSG_v8_9.mdb_Data_PostgreSQL.sql" | psql $(DB)
	psql $(DB) < "$(data_dir)/EPSG_v8_9.mdb_FKeys_PostgreSQL.sql"

download_epsg_polygons:
	mkdir -p $(data_dir)
	wget -P $(data_dir) http://www.epsg.org/polygons/EPSG_Polygons_Ver_8.8.zip
	unzip $(data_dir)/EPSG_Polygons_Ver_8.8.zip -d $(data_dir)

load_epsg_polygons:
	ogr2ogr -f "PostgreSQL" PG:"dbname=$(DB)" -nlt PROMOTE_TO_MULTI -overwrite $(data_dir)/EPSG_Polygons.shp -nln areas_of_use
