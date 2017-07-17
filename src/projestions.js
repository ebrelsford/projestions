import dbgeo from 'dbgeo';
import pg from 'pg';
import Promise from 'promise';
import dbconfig from '../dbconfig';
import turfCombine from '@turf/combine';
import { getGeomType } from '@turf/invariant';

const MAX_LIMIT = 20;

function buildQuery(options) {
    var params = [];
    var columns = [
        'area_name',
        'coord_ref_sys_code',
        'coord_ref_sys_name',
        'uom.unit_of_meas_name'
    ];

    let geom = options.geom;

    // If geom is a GeoJSON FeatureCollection, attempt to combine the features
    // and use the resulting geometry. 
    //
    // TODO test with a mixed (polygon, line, point) FeatureCollection
    let parsedGeom = JSON.parse(geom);
    if (parsedGeom.type === 'FeatureCollection') {
        const combined = turfCombine(parsedGeom);
        if (combined.features.length >= 1) {
            parsedGeom = combined.features[0].geometry
            geom = JSON.stringify(parsedGeom);
        }
        else {
            geom = null;
        }
    }

    var sortColumn;
    switch (options.sortBy) {
        case 'intersectdiff':
            params.push(geom);
            sortColumn = `ABS(ST_Area(ST_Intersection(wkb_geometry, ST_SetSRID(ST_GeomFromGeoJSON($${params.length}), 4326))) - ST_Area(wkb_geometry))`;
            break;
        case 'hausdorff':
            params.push(geom);
            sortColumn = `ST_HausdorffDistance(ST_SetSRID(ST_GeomFromGeoJSON($${params.length}), 4326), wkb_geometry)`;
            break;
        case 'area':
            sortColumn = "ST_Area(wkb_geometry)";
            break;
        case 'areadiff':
        default:
            params.push(geom);
            sortColumn = `ABS(ST_Area(wkb_geometry) - ST_Area(ST_SetSRID(ST_GeomFromGeoJSON($${params.length}), 4326)))`;
            break;
    }


    params.push(geom);
    var whereConditions = [
        `ST_intersects(ST_SetSRID(ST_GeomFromGeoJSON($${params.length}), 4326), wkb_geometry)`
    ];

    const geomType = getGeomType(parsedGeom);
    if (geomType !== 'Point' && geomType !== 'MultiPoint') {
        params.push(geom);
        whereConditions.push(`ST_Area(ST_Intersection(wkb_geometry, ST_SetSRID(ST_GeomFromGeoJSON($${params.length}), 4326))) >= 0.95`);
    }

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

    const combinedSql = `SELECT DISTINCT ${columns.join(', ')}, ${sortColumn} AS sort_by
FROM areas_of_use area 
INNER JOIN epsg_coordinatereferencesystem crs ON crs.area_of_use_code = area_code AND crs.deprecated = 0 
INNER JOIN epsg_coordinatesystem cs ON cs.coord_sys_code = crs.coord_sys_code AND cs.deprecated = 0 
INNER JOIN epsg_coordinateaxis axis ON axis.coord_sys_code = cs.coord_sys_code
INNER JOIN epsg_unitofmeasure uom ON uom.uom_code = axis.uom_code AND uom.deprecated = 0
WHERE ${whereConditions.join(' AND ')}
ORDER BY sort_by
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
