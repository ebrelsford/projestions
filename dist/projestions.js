'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.getProjestions = getProjestions;

var _dbgeo = require('dbgeo');

var _dbgeo2 = _interopRequireDefault(_dbgeo);

var _pg = require('pg');

var _pg2 = _interopRequireDefault(_pg);

var _promise = require('promise');

var _promise2 = _interopRequireDefault(_promise);

var _dbconfig = require('../dbconfig');

var _dbconfig2 = _interopRequireDefault(_dbconfig);

var _buffer = require('@turf/buffer');

var _buffer2 = _interopRequireDefault(_buffer);

var _combine = require('@turf/combine');

var _combine2 = _interopRequireDefault(_combine);

var _invariant = require('@turf/invariant');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var MAX_LIMIT = 20;
var pool = new _pg2.default.Pool(_dbconfig2.default);

pool.on('error', function (err, client) {
    console.error('Unexpected error on idle client', err);
});

function buildQuery(options) {
    var params = [];
    var columns = ['area_name', 'coord_ref_sys_code', 'coord_ref_sys_name', 'unit_of_meas_name'];

    var geom = options.geom;

    // If geom is a GeoJSON FeatureCollection, attempt to combine the features
    // and use the resulting geometry.
    //
    // TODO test with a mixed (polygon, line, point) FeatureCollection
    var parsedGeom = JSON.parse(geom);
    if (parsedGeom.type === 'FeatureCollection') {
        var combined = (0, _combine2.default)(parsedGeom);
        if (combined.features.length >= 1) {
            parsedGeom = combined.features[0].geometry;
            geom = JSON.stringify(parsedGeom);
        } else {
            geom = null;
        }
    }

    var geomType = (0, _invariant.getGeomType)(parsedGeom);
    if (geomType !== 'Polygon' && geomType !== 'MultiPolygon') {
        parsedGeom = (0, _buffer2.default)(parsedGeom, 0.00001, 'kilometers').geometry;
        geom = JSON.stringify(parsedGeom);
    }

    // For the CTE geometry
    params.push(geom);

    var sortColumn;
    switch (options.sortBy) {
        case 'intersectdiff':
            sortColumn = 'ABS(ST_Area(ST_Intersection(wkb_geometry_simplified, i.geom)) - ST_Area(wkb_geometry_simplified))';
            break;
        case 'hausdorff':
            sortColumn = 'ST_HausdorffDistance(i.geom, wkb_geometry_simplified)';
            break;
        case 'area':
            sortColumn = "ST_Area(wkb_geometry_simplified)";
            break;
        case 'areadiff':
        default:
            sortColumn = 'ABS(ST_Area(wkb_geometry_simplified) - i.area)';
            break;
    }

    if (options.getGeoJson) {
        columns.push('ST_AsGeoJson(wkb_geometry_simplified, 6) AS geojson_geometry');
    }

    var whereConditions = [];
    if (options.unitsValue) {
        params.push(options.unitsValue);
        whereConditions.push('unit_of_meas_name = $' + params.length);
    }

    params.push(Math.min(options.limitValue, MAX_LIMIT));
    var limit = 'LIMIT $' + params.length;

    params.push(Math.max(options.offsetValue, 0));
    var offset = 'OFFSET $' + params.length;

    var combinedSql = 'WITH input_geom AS (\n    SELECT ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)) AS geom, ST_Area(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON($1), 4326))) AS area\n),\nmatching_areas AS (\n    SELECT area_code\n    FROM areas_of_use, input_geom\n    WHERE ST_Intersects(wkb_geometry_simplified, input_geom.geom) AND (ST_CoveredBy(input_geom.geom, wkb_geometry_simplified) OR ST_Area(ST_Intersection(wkb_geometry_simplified, input_geom.geom)) / input_geom.area >= 0.95)\n)\nSELECT DISTINCT ' + columns.join(', ') + ', ' + sortColumn + ' AS sort_by\nFROM input_geom i, projestions_joined\nWHERE area_code IN (SELECT * FROM matching_areas) ' + (whereConditions.length ? whereConditions.join(' AND ') : '') + '\nORDER BY sort_by, coord_ref_sys_code\n' + limit + '\n' + offset;

    return {
        sql: combinedSql,
        params: params
    };
}

function getProjestions(options) {
    var _buildQuery = buildQuery(options);

    var sql = _buildQuery.sql;
    var params = _buildQuery.params;

    return new _promise2.default(function (resolve, reject) {
        pool.query(sql, params).catch(function (err) {
            console.error(err);
            return reject(err);
        }).then(function (res) {
            var rows = res.rows;
            if (options.getGeoJson) {
                _dbgeo2.default.parse({
                    data: rows,
                    geometryColumn: 'geojson_geometry'
                }, function (err, result) {
                    if (err) {
                        console.error(err);
                        return reject(err);
                    }
                    return resolve(result);
                });
            } else {
                return resolve(rows);
            }
        });
    });
}