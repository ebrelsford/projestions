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

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var MAX_LIMIT = 20;

function buildQuery(options) {
    var params = [];
    var columns = ['area_name', 'coord_ref_sys_code', 'coord_ref_sys_name', 'uom.unit_of_meas_name'];

    params.push(options.geom);
    var whereConditions = ['ST_intersects(ST_SetSRID(ST_GeomFromGeoJSON($' + params.length + '), 4326), wkb_geometry)'];

    if (options.getGeoJson) {
        columns.push('ST_AsGeoJson(ST_Simplify(wkb_geometry, 0.01), 6) AS geojson_geometry');
    }
    if (options.unitsValue) {
        params.push(options.unitsValue);
        whereConditions.push('uom.unit_of_meas_name = $' + params.length);
    }

    params.push(Math.min(options.limitValue, MAX_LIMIT));
    var limit = 'LIMIT $' + params.length;

    params.push(Math.max(options.offsetValue, 0));
    var offset = 'OFFSET $' + params.length;

    var combinedSql = 'SELECT DISTINCT ' + columns.join(', ') + ', ST_Area(wkb_geometry)\nFROM areas_of_use area \nINNER JOIN epsg_coordinatereferencesystem crs ON crs.area_of_use_code = area_code AND crs.deprecated = 0 \nINNER JOIN epsg_coordinatesystem cs ON cs.coord_sys_code = crs.coord_sys_code AND cs.deprecated = 0 \nINNER JOIN epsg_coordinateaxis axis ON axis.coord_sys_code = cs.coord_sys_code\nINNER JOIN epsg_unitofmeasure uom ON uom.uom_code = axis.uom_code AND uom.deprecated = 0\nWHERE ' + whereConditions.join(' AND ') + '\nORDER BY ST_Area(wkb_geometry)\n' + limit + '\n' + offset;

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
        _pg2.default.connect(_dbconfig2.default, function (err, client, done) {
            // Handle connection errors
            if (err) {
                done();
                console.error(err);
                return reject(err);
            }

            var query = client.query(sql, params);

            var results = [];
            query.on('row', function (row) {
                results.push(row);
            });

            // After all data is returned, close connection and return results
            query.on('end', function () {
                done();
                if (options.getGeoJson) {
                    _dbgeo2.default.parse({
                        data: results,
                        geometryColumn: 'geojson_geometry'
                    }, function (err, result) {
                        if (err) {
                            console.error(err);
                            return reject(err);
                        }
                        return resolve(result);
                    });
                } else {
                    return resolve(results);
                }
            });
        });
    });
}