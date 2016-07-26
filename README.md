# projestions

Map projection suggestions. [Demo](http://projest.io/ns/).

Provides a simple API for finding map projections appropriate for a particular area.

## Data

The results of the API based on the [EPSG](http://www.epsg.org/)'s CRS data (v8.9) and its "area of use" data (v8.8). Both datasets are available to [download on the EPSG site](http://www.epsg.org/EPSGDataset/DownloadDataset.aspx). You might be interested in their [terms of use](http://www.epsg.org/TermsOfUse).

## Prior art

Similar things have been done before:

 * [epsg.io](http://epsg.io/) has an [API](https://github.com/klokantech/epsg.io#api-for-results)
 * [epsg-registry.org](http://www.epsg-registry.org/) has a way to search by bounding box
 * ...and others, I'm sure.

## API

[Check out the demo](http://projest.io/ns/) to see it in action.

### Endpoint

`http://projest.io/ns/api/`

### Parameters

name | value | description
--- | --- | ---
geom | GeoJSON feature | (required) the feature you want to find an appropriate projection for
geojson | boolean | (optional) `true` to return GeoJSON of areas of use, else JSON is returned, default `false`
max | number | (optional) maximum number of results to return, default `20`
offset | number | (optional) number of results to skip, default `0`
sort | string | (optional) how to sort results, `hausdorff` to sort by the [Hausdorff distance](http://postgis.net/docs/ST_HausdorffDistance.html) or `area` to sort by the area of use's area, default `area`. 
units | string | (optional) projection units to return, default all

### Returns

Each projection overlapping with the given `geom`. If `geojson` is `true`, returns GeoJSON of the polygons of the areas of use.

## License

GPLv3. See `LICENSE.txt`.
