import express from 'express';
import bodyParser from 'body-parser';
import multer from 'multer';
import {getProjestions} from './projestions';
import config from '../config';

var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
var upload = multer();

app.all('/', (req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    next();
});

function getQueryParams(query) {
    const getGeoJson = query.geojson && query.geojson === 'true';
    return {
        geom: query.geom,
        getGeoJson: getGeoJson,
        limitValue: query.max ? parseInt(query.max) : Infinity,
        offsetValue: query.offset ? parseInt(query.offset) : 0,
        sortBy: query.sort,
        unitsValue: query.units
    };
}

app.get('/', (req, res) => {
    getProjestions(getQueryParams(req.query))
    .done(
        (result) => {
            return res.json(result);
        },
        (err) => {
            console.error(err);
            return res.status(500).json({ success: false, data: err });
        }
    );
});

app.post('/', upload.array(), (req, res) => {
    const params = getQueryParams(req.query);
    params.geom = req.body.geom;

    getProjestions(params)
    .done(
        (result) => {
            return res.json(result);
        },
        (err) => {
            console.error(err);
            return res.status(500).json({ success: false, data: err });
        }
    );
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    return res.status(500).json({ error: true });
});

app.listen(config.port, () => {
    console.log(`projestions listening on port ${config.port}!`);
});
