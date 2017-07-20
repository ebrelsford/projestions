import dbgeo from 'dbgeo';
import pg from 'pg';
import Promise from 'promise';
import dbconfig from '../dbconfig';
import turfBuffer from '@turf/buffer';
import turfCombine from '@turf/combine';
import { getGeomType } from '@turf/invariant';

const MAX_LIMIT = 20;
const pool = new pg.Pool(dbconfig);

pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
})

function buildQuery(options) {
    var params = [];
    var columns = [
        'area_name',
        'coord_ref_sys_code',
        'coord_ref_sys_name',
        'unit_of_meas_name'
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

    const geomType = getGeomType(parsedGeom);
    if (geomType !== 'Polygon' && geomType !== 'MultiPolygon') {
        parsedGeom = turfBuffer(parsedGeom, 0.00001, 'kilometers').geometry;
        geom = JSON.stringify(parsedGeom);
    }

    // For the CTE geometry
    params.push(geom);

    var sortColumn;
    switch (options.sortBy) {
        case 'intersectdiff':
            sortColumn = `ABS(ST_Area(ST_Intersection(wkb_geometry_simplified, i.geom)) - ST_Area(wkb_geometry_simplified))`;
            break;
        case 'hausdorff':
            sortColumn = `ST_HausdorffDistance(i.geom, wkb_geometry_simplified)`;
            break;
        case 'area':
            sortColumn = "ST_Area(wkb_geometry_simplified)";
            break;
        case 'areadiff':
        default:
            sortColumn = `ABS(ST_Area(wkb_geometry_simplified) - i.area)`;
            break;
    }

    if (options.getGeoJson) {
        columns.push('ST_AsGeoJson(wkb_geometry_simplified, 6) AS geojson_geometry');
    }

    var whereConditions = [];
    if (options.unitsValue) {
        params.push(options.unitsValue);
        whereConditions.push(`unit_of_meas_name = $${params.length}`);
    }

    params.push(Math.min(options.limitValue, MAX_LIMIT));
    const limit = `LIMIT $${params.length}`;

    params.push(Math.max(options.offsetValue, 0));
    const offset = `OFFSET $${params.length}`;

    const combinedSql = `WITH input_geom AS (
    SELECT ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)) AS geom, ST_Area(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON($1), 4326))) AS area
),
matching_areas AS (
    SELECT area_code
    FROM areas_of_use, input_geom
    WHERE ST_Intersects(wkb_geometry_simplified, input_geom.geom) AND (ST_CoveredBy(input_geom.geom, wkb_geometry_simplified) OR ST_Area(ST_Intersection(wkb_geometry_simplified, input_geom.geom)) / input_geom.area >= 0.95)
)
SELECT DISTINCT ${columns.join(', ')}, ${sortColumn} AS sort_by
FROM input_geom i, projestions_joined
WHERE area_code IN (SELECT * FROM matching_areas) ${whereConditions.length ? whereConditions.join(' AND ') : ''}
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
        pool.query(sql, params)
            .catch(err => {
                console.error(err);
                return reject(err);
            })
            .then(res => {
                const rows = res.rows;
                if (options.getGeoJson) {
                    dbgeo.parse({
                        data: rows,
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
                    return resolve(rows);
                }
            });
    });
}
