import express from 'express';
import bodyParser from 'body-parser';
import multer from 'multer';
import getProjestions from './projestions';
import config from '../config';

const app = express();

app.use(bodyParser.json({ limit: '5mb' }));
app.use(bodyParser.urlencoded({ limit: '5mb', extended: true }));
const upload = multer();

app.all('/', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'X-Requested-With');
  next();
});

function getQueryParams(query) {
  const getGeoJson = query.geojson && query.geojson === 'true';
  return {
    geom: query.geom,
    getGeoJson,
    limitValue: query.max ? parseInt(query.max, 10) : Infinity,
    offsetValue: query.offset ? parseInt(query.offset, 10) : 0,
    sortBy: query.sort,
    unitsValue: query.units,
  };
}

app.get('/', (req, res) => {
  getProjestions(getQueryParams(req.query))
    .done(
      result => res.json(result),
      (err) => {
        console.error(err);
        return res.status(500).json({ success: false, data: err });
      },
    );
});

app.post('/', upload.array(), (req, res) => {
  const params = getQueryParams(req.query);
  params.geom = req.body.geom;

  getProjestions(params)
    .done(
      result => res.json(result),
      (err) => {
        console.error(err);
        return res.status(500).json({ success: false, data: err });
      },
    );
});

app.use((err, req, res) => {
  console.error(err.stack);
  return res.status(500).json({ error: true });
});

app.listen(config.port, () => {
  console.log(`projestions listening on port ${config.port}!`);
});
