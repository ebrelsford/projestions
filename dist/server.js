'use strict';

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _bodyParser = require('body-parser');

var _bodyParser2 = _interopRequireDefault(_bodyParser);

var _multer = require('multer');

var _multer2 = _interopRequireDefault(_multer);

var _projestions = require('./projestions');

var _projestions2 = _interopRequireDefault(_projestions);

var _config = require('../config');

var _config2 = _interopRequireDefault(_config);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var app = (0, _express2.default)();

app.use(_bodyParser2.default.json({ limit: '5mb' }));
app.use(_bodyParser2.default.urlencoded({ limit: '5mb', extended: true }));
var upload = (0, _multer2.default)();

app.all('/', function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'X-Requested-With');
  next();
});

function getQueryParams(query) {
  var getGeoJson = query.geojson && query.geojson === 'true';
  return {
    geom: query.geom,
    getGeoJson: getGeoJson,
    limitValue: query.max ? parseInt(query.max, 10) : Infinity,
    offsetValue: query.offset ? parseInt(query.offset, 10) : 0,
    sortBy: query.sort,
    unitsValue: query.units
  };
}

app.get('/', function (req, res) {
  (0, _projestions2.default)(getQueryParams(req.query)).done(function (result) {
    return res.json(result);
  }, function (err) {
    console.error(err);
    return res.status(500).json({ success: false, data: err });
  });
});

app.post('/', upload.array(), function (req, res) {
  var params = getQueryParams(req.query);
  params.geom = req.body.geom;

  (0, _projestions2.default)(params).done(function (result) {
    return res.json(result);
  }, function (err) {
    console.error(err);
    return res.status(500).json({ success: false, data: err });
  });
});

app.use(function (err, req, res) {
  console.error(err.stack);
  return res.status(500).json({ error: true });
});

app.listen(_config2.default.port, function () {
  console.log('projestions listening on port ' + _config2.default.port + '!');
});