'use strict';

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _projestions = require('./projestions');

var _config = require('../config');

var _config2 = _interopRequireDefault(_config);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var app = (0, _express2.default)();

app.all('/', function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    next();
});

app.get('/', function (req, res) {
    var getGeoJson = req.query.geojson && req.query.geojson === 'true';

    (0, _projestions.getProjestions)({
        geom: req.query.geom,
        getGeoJson: getGeoJson,
        limitValue: req.query.max ? parseInt(req.query.max) : Infinity,
        offsetValue: req.query.offset ? parseInt(req.query.offset) : 0,
        unitsValue: req.query.units
    }).done(function (result) {
        return res.json(result);
    }, function (err) {
        console.error(err);
        return res.status(500).json({ success: false, data: err });
    });
});

app.use(function (err, req, res, next) {
    console.error(err.stack);
    return res.status(500).json({ error: true });
});

app.listen(_config2.default.port, function () {
    console.log('projestions listening on port ' + _config2.default.port + '!');
});