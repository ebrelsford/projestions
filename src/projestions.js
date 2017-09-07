import dbgeo from 'dbgeo';
import pg from 'pg';
import Promise from 'promise';
import turfBuffer from '@turf/buffer';
import turfCombine from '@turf/combine';
import { getGeomType } from '@turf/invariant';
import dbconfig from '../dbconfig';

const MAX_LIMIT = 20;
const pool = new pg.Pool(dbconfig);

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

function getSortColumn(name) {
  switch (name) {
    case 'intersectdiff':
      return 'ABS(ST_Area(ST_Intersection(wkb_geometry_simplified, i.geom)) - ST_Area(wkb_geometry_simplified))';
    case 'hausdorff':
      return 'ST_HausdorffDistance(i.geom, wkb_geometry_simplified)';
    case 'area':
      return 'ST_Area(wkb_geometry_simplified)';
    case 'areadiff':
    default:
      return 'ABS(ST_Area(wkb_geometry_simplified) - i.area)';
  }
}

function prepareGeometry(geojsonString) {
  // If geom is a GeoJSON FeatureCollection, attempt to combine the features
  // and use the resulting geometry. 
  let parsedGeom = JSON.parse(geojsonString);
  if (parsedGeom.type === 'FeatureCollection') {
    const combined = turfCombine(parsedGeom);
    if (combined.features.length >= 1) {
      parsedGeom = combined.features[0].geometry;
    }
  }

  // If geom is not a Polygon, buffer it to make it one since we'll be talking
  // about its area later
  if (getGeomType(parsedGeom) !== 'Polygon') {
    parsedGeom = turfBuffer(parsedGeom, 0.00001, 'kilometers').geometry;
  }
  return parsedGeom;
}

function buildQuery(options) {
  const params = [];
  const columns = [
    'area_name',
    'coord_ref_sys_code',
    'coord_ref_sys_name',
    'unit_of_meas_name',
    `${getSortColumn(options.sortBy)} AS sort_by`,
  ];
  const whereConditions = [
    'area_code IN (SELECT * FROM matching_areas)',
  ];

  // First param is the prepared geometry for the CTE ($1)
  params.push(JSON.stringify(prepareGeometry(options.geom)));

  if (options.getGeoJson) {
    columns.push('ST_AsGeoJson(wkb_geometry_simplified, 6) AS geojson_geometry');
  }

  if (options.unitsValue) {
    params.push(options.unitsValue);
    whereConditions.push(`unit_of_meas_name = $${params.length}`);
  }

  params.push(Math.min(options.limitValue, MAX_LIMIT));
  const limit = `LIMIT $${params.length}`;

  params.push(Math.max(options.offsetValue, 0));
  const offset = `OFFSET $${params.length}`;

  // We use a few CTEs here for intermediate results:
  //  * valid_geom: the prepared geometry with SRID and made valid
  //  * input_geom: the valid_geom plus its area
  //  * matching_areas: areas in the EPSG data that cover at least 95% of the
  //  input geometry
  const combinedSql = `WITH valid_geom AS (
    SELECT ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)) AS geom
),
input_geom AS (
    SELECT v.geom AS geom, ST_Area(v.geom) AS area
    FROM valid_geom v
),
matching_areas AS (
    SELECT area_code
    FROM areas_of_use, input_geom
    WHERE 
        ST_Intersects(wkb_geometry_simplified, input_geom.geom)
        AND (
            ST_CoveredBy(input_geom.geom, wkb_geometry_simplified) OR
            ST_Area(ST_Intersection(wkb_geometry_simplified, input_geom.geom)) / input_geom.area >= 0.95
        )
)
SELECT DISTINCT ${columns.join(', ')}
FROM input_geom i, projestions_joined
WHERE ${whereConditions.join(' AND ')}
ORDER BY sort_by, coord_ref_sys_code
${limit}
${offset}`;

  return {
    sql: combinedSql,
    params,
  };
}

export default function getProjestions(options) {
  return new Promise((resolve, reject) => {
    if (!options.geom) {
      return reject('No geom provided');
    }
    const { sql, params } = buildQuery(options);
    return pool.query(sql, params)
      .catch((err) => {
        console.error(err);
        return reject(err);
      })
      .then((res) => {
        const rows = res.rows;
        if (options.getGeoJson) {
          return dbgeo.parse({
            data: rows,
            geometryColumn: 'geojson_geometry',
          }, (err, result) => {
            if (err) {
              console.error(err);
              return reject(err);
            }
            return resolve(result);
          });
        }
        return resolve(rows);
      });
  });
}
