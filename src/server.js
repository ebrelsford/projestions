import express from 'express';
import {getProjestions} from './projestions';
import config from '../config';

var app = express();

app.all('/', (req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    next();
});

app.get('/', (req, res) => {
    const getGeoJson = req.query.geojson && req.query.geojson === 'true';

    getProjestions({
        geom: req.query.geom,
        getGeoJson: getGeoJson,
        limitValue: req.query.max ? parseInt(req.query.max) : Infinity,
        offsetValue: req.query.offset ? parseInt(req.query.offset) : 0,
        unitsValue: req.query.units
    })
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
