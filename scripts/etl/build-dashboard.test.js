import test from 'node:test';
import assert from 'node:assert/strict';
import { SOURCE_PERIOD } from '../../shared/metros.js';
import { buildDashboardPayload } from './build-dashboard.js';

const monthlySeries = {
  sunnyDaysAvg: Array.from({ length: 12 }, (_value, index) => index + 1),
  cloudyDaysAvg: Array.from({ length: 12 }, (_value, index) => 12 - index),
  rainyDaysAvg: Array.from({ length: 12 }, () => 8),
  rainfallMmAvg: Array.from({ length: 12 }, () => 50),
  sunHoursAvg: Array.from({ length: 12 }, () => 100),
  hotDays30Avg: Array.from({ length: 12 }, () => 2),
  windyDaysAvg: Array.from({ length: 12 }, () => 4),
  uvIndexAvg: Array.from({ length: 12 }, () => 2.5),
  humidityAvg: Array.from({ length: 12 }, () => 70),
  summerMaxTempAvg: Array.from({ length: 12 }, (_value, index) => (index >= 5 && index <= 7 ? 25 : 15))
};

test('buildDashboardPayload returns the static dashboard contract', () => {
  const payload = buildDashboardPayload({
    generatedAt: '2026-03-29T12:00:00.000Z',
    cities: [
      {
        slug: 'pau',
        name: 'Pau',
        region: 'Nouvelle-Aquitaine',
        metroPopulation: 200000,
        sunnyDaysAvg: 120,
        rainyDaysAvg: 105,
        cloudyDaysAvg: 95,
        rainfallMmAvg: 1000,
        sunHoursAvg: 1800,
        hotDays30Avg: 6,
        windyDaysAvg: 40,
        uvIndexAvg: 2.6,
        humidityAvg: 70,
        summerMaxTempAvg: 25,
        monthlyMetrics: monthlySeries,
        stationName: 'PAU-UZEIN',
        stationDistanceKm: 8,
        dataCoverage: 98
      }
    ]
  });

  assert.equal(payload.generatedAt, '2026-03-29T12:00:00.000Z');
  assert.deepEqual(payload.sourcePeriod, SOURCE_PERIOD);
  assert.ok(Array.isArray(payload.criteria));
  assert.ok(payload.criteria.length > 0);
  assert.ok(payload.criteria.every((criterion) => typeof criterion.source === 'string' && criterion.source.length > 0));
  assert.ok(
    payload.criteria.every((criterion) => typeof criterion.coverage === 'string' && criterion.coverage.length > 0)
  );
  assert.ok(Array.isArray(payload.notes));
  assert.ok(payload.notes.length > 0);
  assert.ok(Array.isArray(payload.presets));
  assert.deepEqual(
    payload.presets.map((preset) => preset.id),
    ['sun-lover', 'pluviophile']
  );
  assert.ok(payload.presets.every((preset) => !preset.id.startsWith('saved-')));
  assert.equal(payload.cities.length, 1);
  assert.equal(payload.cities[0].slug, 'pau');
  assert.deepEqual(payload.cities[0].monthlyMetrics.uvIndexAvg, Array.from({ length: 12 }, () => 2.5));
  assert.deepEqual(payload.cities[0].monthlyMetrics.humidityAvg, Array.from({ length: 12 }, () => 70));
});
