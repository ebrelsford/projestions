const fs = require('fs');
const path = require('path');

jest.dontMock('../dist/projestions.js');
const getProjestions = require('../dist/projestions.js').default;

function openData(name) {
  return fs.readFileSync(path.join(__dirname, 'data', name), { encoding: 'utf8' });
}

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
  ).resolves.toBeTruthy();
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
  ).resolves.toBeTruthy();
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
  ).resolves.toBeTruthy();
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
  ).resolves.toBeTruthy();
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
  ).resolves.toBeTruthy();
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
  ).resolves.toBeTruthy();
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
  ).resolves.toBeTruthy();
});
