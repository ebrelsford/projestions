import dbgeo from 'dbgeo';
import pg from 'pg';
import Promise from 'promise';
import dbconfig from '../dbconfig';

const MAX_LIMIT = 20;

function buildQuery(options) {
    /*
      TODO:
       - more search options? by crs name, area name
       - other properties (area, distance preserved)?
    */
    var params = [];
    var columns = [
        'area_name',
        'coord_ref_sys_code',
        'coord_ref_sys_name',
        'uom.unit_of_meas_name'
    ];

    params.push(options.geom);
    var whereConditions = [
        `ST_intersects(ST_SetSRID(ST_GeomFromGeoJSON($${params.length}), 4326), wkb_geometry)`
    ];

    if (options.getGeoJson) {
        columns.push('ST_AsGeoJson(ST_Simplify(wkb_geometry, 0.01), 6) AS geojson_geometry');
    }
    if (options.unitsValue) {
        params.push(options.unitsValue);
        whereConditions.push(`uom.unit_of_meas_name = $${params.length}`);
    }

    params.push(Math.min(options.limitValue, MAX_LIMIT));
    const limit = `LIMIT $${params.length}`;

    params.push(Math.max(options.offsetValue, 0));
    const offset = `OFFSET $${params.length}`;

    const combinedSql = `SELECT ${columns.join(', ')}
FROM areas_of_use area 
INNER JOIN epsg_coordinatereferencesystem crs ON crs.area_of_use_code = area_code AND crs.deprecated = 0 
JOIN epsg_coordinatesystem cs ON cs.coord_sys_code = crs.coord_sys_code AND cs.deprecated = 0 
JOIN epsg_coordinateaxis axis ON axis.coord_sys_code = cs.coord_sys_code
JOIN epsg_unitofmeasure uom ON uom.uom_code = axis.uom_code AND uom.deprecated = 0
WHERE ${whereConditions.join(' AND ')}
ORDER BY ST_Area(wkb_geometry)
${limit}
${offset}`;

    return {
        sql: combinedSql,
        params: params
    };
}

export function getProjestions(options) {
    const {sql, params} = buildQuery(options);
    return new Promise((resolve, reject) => {
        pg.connect(dbconfig, (err, client, done) => {
            // Handle connection errors
            if (err) {
                done();
                console.error(err);
                return reject(err);
            }

            var query = client.query(sql, params);

            var results = [];
            query.on('row', (row) => {
                results.push(row);
            });

            // After all data is returned, close connection and return results
            query.on('end', () => {
                done();
                if (options.getGeoJson) {
                    dbgeo.parse({
                        data: results,
                        geometryColumn: 'geojson_geometry'
                    }, (err, result) => {
                        if (err) {
                            console.error(err);
                            return reject(err);
                        }
                        return resolve(result);
                    });
                }
                else {
                    return resolve(results);
                }
            });
        });
    });
}
