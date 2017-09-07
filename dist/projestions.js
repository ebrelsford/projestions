'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = getProjestions;

var _dbgeo = require('dbgeo');

var _dbgeo2 = _interopRequireDefault(_dbgeo);

var _pg = require('pg');

var _pg2 = _interopRequireDefault(_pg);

var _promise = require('promise');

var _promise2 = _interopRequireDefault(_promise);

var _buffer = require('@turf/buffer');

var _buffer2 = _interopRequireDefault(_buffer);

var _combine = require('@turf/combine');

var _combine2 = _interopRequireDefault(_combine);

var _invariant = require('@turf/invariant');

var _dbconfig = require('../dbconfig');

var _dbconfig2 = _interopRequireDefault(_dbconfig);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var MAX_LIMIT = 20;
var pool = new _pg2.default.Pool(_dbconfig2.default);

pool.on('error', function (err) {
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
  var parsedGeom = JSON.parse(geojsonString);
  if (parsedGeom.type === 'FeatureCollection') {
    var combined = (0, _combine2.default)(parsedGeom);
    if (combined.features.length >= 1) {
      parsedGeom = combined.features[0].geometry;
    }
  }

  // If geom is not a Polygon, buffer it to make it one since we'll be talking
  // about its area later
  if ((0, _invariant.getGeomType)(parsedGeom) !== 'Polygon') {
    parsedGeom = (0, _buffer2.default)(parsedGeom, 0.00001, 'kilometers').geometry;
  }
  return parsedGeom;
}

function buildQuery(options) {
  var params = [];
  var columns = ['area_name', 'coord_ref_sys_code', 'coord_ref_sys_name', 'unit_of_meas_name', getSortColumn(options.sortBy) + ' AS sort_by'];
  var whereConditions = ['area_code IN (SELECT * FROM matching_areas)'];

  // First param is the prepared geometry for the CTE ($1)
  params.push(JSON.stringify(prepareGeometry(options.geom)));

  if (options.getGeoJson) {
    columns.push('ST_AsGeoJson(wkb_geometry_simplified, 6) AS geojson_geometry');
  }

  if (options.unitsValue) {
    params.push(options.unitsValue);
    whereConditions.push('unit_of_meas_name = $' + params.length);
  }

  params.push(Math.min(options.limitValue, MAX_LIMIT));
  var limit = 'LIMIT $' + params.length;

  params.push(Math.max(options.offsetValue, 0));
  var offset = 'OFFSET $' + params.length;

  // We use a few CTEs here for intermediate results:
  //  * valid_geom: the prepared geometry with SRID and made valid
  //  * input_geom: the valid_geom plus its area
  //  * matching_areas: areas in the EPSG data that cover at least 95% of the
  //  input geometry
  var combinedSql = 'WITH valid_geom AS (\n    SELECT ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)) AS geom\n),\ninput_geom AS (\n    SELECT v.geom AS geom, ST_Area(v.geom) AS area\n    FROM valid_geom v\n),\nmatching_areas AS (\n    SELECT area_code\n    FROM areas_of_use, input_geom\n    WHERE \n        ST_Intersects(wkb_geometry_simplified, input_geom.geom)\n        AND (\n            ST_CoveredBy(input_geom.geom, wkb_geometry_simplified) OR\n            ST_Area(ST_Intersection(wkb_geometry_simplified, input_geom.geom)) / input_geom.area >= 0.95\n        )\n)\nSELECT DISTINCT ' + columns.join(', ') + '\nFROM input_geom i, projestions_joined\nWHERE ' + whereConditions.join(' AND ') + '\nORDER BY sort_by, coord_ref_sys_code\n' + limit + '\n' + offset;

  return {
    sql: combinedSql,
    params: params
  };
}

function getProjestions(options) {
  return new _promise2.default(function (resolve, reject) {
    if (!options.geom) {
      return reject('No geom provided');
    }

    var _buildQuery = buildQuery(options),
        sql = _buildQuery.sql,
        params = _buildQuery.params;

    return pool.query(sql, params).catch(function (err) {
      console.error(err);
      return reject(err);
    }).then(function (res) {
      var rows = res.rows;
      if (options.getGeoJson) {
        return _dbgeo2.default.parse({
          data: rows,
          geometryColumn: 'geojson_geometry'
        }, function (err, result) {
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