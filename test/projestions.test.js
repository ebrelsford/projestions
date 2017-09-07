const fs = require('fs');
const path = require('path');

jest.dontMock('../dist/projestions.js');
const getProjestions = require('../dist/projestions.js').default;

function openData(name) {
  return fs.readFileSync(path.join(__dirname, 'data', name), { encoding: 'utf8' });
}

expect.extend({
  toBeNonemptyResultsArray(received) {
    let pass = received instanceof Array && received.length > 0;
    if (pass) {
      const testElement = received[0];
      pass = (testElement.area_name != null && testElement.coord_ref_sys_code != null);
    }
    return {
      message: () => `expected ${received} to be non-empty results array`,
      pass
    };
  },
  toBeGeojson(received) {
    let pass = received instanceof Object && received.type === 'FeatureCollection';
    if (pass) {
      const testElement = received.features[0];
      pass = (testElement.type === 'Feature' && testElement.properties.area_name != null);
    }
    return {
      message: () => `expected ${received} to be non-empty results array`,
      pass
    };
  }
});

test('point', () => {
  expect.assertions(1);
  return expect(
    getProjestions({
      geom: openData('point.geojson'),
      getGeoJson: false,
      limitValue: 10,
      offsetValue: 0,
      sortBy: 'area'
    })
  ).resolves.toBeNonemptyResultsArray();
});

test('point geojson', () => {
  expect.assertions(1);
  return expect(
    getProjestions({
      geom: openData('point.geojson'),
      getGeoJson: true,
      limitValue: 10,
      offsetValue: 0,
      sortBy: 'area'
    })
  ).resolves.toBeGeojson();
});

test('point meters', () => {
  expect.assertions(1);
  return expect(
    getProjestions({
      geom: openData('point.geojson'),
      getGeoJson: false,
      limitValue: 10,
      offsetValue: 0,
      sortBy: 'area',
      unitsValue: 'metre'
    })
  ).resolves.toBeNonemptyResultsArray();
});

test('point areadiff', () => {
  expect.assertions(1);
  return expect(
    getProjestions({
      geom: openData('point.geojson'),
      getGeoJson: false,
      limitValue: 10,
      offsetValue: 0,
      sortBy: 'areadiff'
    })
  ).resolves.toBeNonemptyResultsArray();
});

test('point intersectdiff', () => {
  expect.assertions(1);
  return expect(
    getProjestions({
      geom: openData('point.geojson'),
      getGeoJson: false,
      limitValue: 10,
      offsetValue: 0,
      sortBy: 'areadiff'
    })
  ).resolves.toBeNonemptyResultsArray();
});

test('point hausdorff', () => {
  expect.assertions(1);
  return expect(
    getProjestions({
      geom: openData('point.geojson'),
      getGeoJson: false,
      limitValue: 10,
      offsetValue: 0,
      sortBy: 'areadiff'
    })
  ).resolves.toBeNonemptyResultsArray();
});

test('many points', () => {
  expect.assertions(1);
  return expect(
    getProjestions({
      geom: openData('many-points.geojson'),
      getGeoJson: false,
      limitValue: 10,
      offsetValue: 0,
      sortBy: 'area'
    })
  ).resolves.toBeNonemptyResultsArray();
});

test('line', () => {
  expect.assertions(1);
  return expect(
    getProjestions({
      geom: openData('line.geojson'),
      getGeoJson: false,
      limitValue: 10,
      offsetValue: 0,
      sortBy: 'area'
    })
  ).resolves.toBeNonemptyResultsArray();
});

test('polygon', () => {
  expect.assertions(1);
  return expect(
    getProjestions({
      geom: openData('polygon.geojson'),
      getGeoJson: false,
      limitValue: 10,
      offsetValue: 0,
      sortBy: 'area'
    })
  ).resolves.toBeNonemptyResultsArray();
});

test('multipolygon', () => {
  expect.assertions(1);
  return expect(
    getProjestions({
      geom: openData('nyc-boroughs.geojson'),
      getGeoJson: false,
      limitValue: 10,
      offsetValue: 0,
      sortBy: 'area'
    })
  ).resolves.toBeNonemptyResultsArray();
});

test('point line and polygon', () => {
  expect.assertions(1);
  return expect(
    getProjestions({
      geom: openData('combined.geojson'),
      getGeoJson: false,
      limitValue: 10,
      offsetValue: 0,
      sortBy: 'area'
    })
  ).resolves.toBeNonemptyResultsArray();
});

test('failure: no options passed', () => {
  expect.assertions(1);
  return expect(getProjestions({})).rejects.toBeDefined();
});
