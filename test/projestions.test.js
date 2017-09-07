const fs = require('fs');
const path = require('path');

jest.dontMock('../dist/projestions.js');
const projestions = require('../dist/projestions.js');

function openData(name) {
  return fs.readFileSync(path.join(__dirname, 'data', name), { encoding: 'utf8' });
}

test('point', () => {
  expect.assertions(1);
  return expect(
    projestions.getProjestions({
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
    projestions.getProjestions({
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
    projestions.getProjestions({
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
    projestions.getProjestions({
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
    projestions.getProjestions({
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
    projestions.getProjestions({
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
    projestions.getProjestions({
      geom: openData('combined.geojson'),
      getGeoJson: false,
      limitValue: 10,
      offsetValue: 0,
      sortBy: 'area'
    })
  ).resolves.toBeTruthy();
});
