import test from 'node:test';
import assert from 'node:assert/strict';
import { createHeaderIndex, processMonthlyLine, selectNearestStation, summarizeStation } from './etl-lib.js';

const HEADER = createHeaderIndex(
  'NUM_POSTE;NOM_USUEL;LAT;LON;AAAAMM;RR;NBJRR1;NBJTX30;NBJFF10;INST;NBSIGMA80;NBSIGMA20;UMM;TX'
);

function buildLine({
  stationId = '00000001',
  stationName = 'Station Test',
  year,
  month,
  rr,
  nbjrr1,
  nbjtx30,
  nbjff10,
  inst,
  sigma80,
  sigma20,
  umm,
  tx
}) {
  return [
    stationId,
    stationName,
    '43.6000',
    '1.4400',
    `${year}${String(month).padStart(2, '0')}`,
    rr,
    nbjrr1,
    nbjtx30,
    nbjff10,
    inst,
    sigma80,
    sigma20,
    umm,
    tx
  ].join(';');
}

test('summarizeStation aggregates 10 years of monthly data into annual averages', () => {
  const stations = new Map();

  for (let year = 2015; year <= 2024; year += 1) {
    for (let month = 1; month <= 12; month += 1) {
      processMonthlyLine(
        buildLine({
          year,
          month,
          rr: 50,
          nbjrr1: 8,
          nbjtx30: 2,
          nbjff10: 4,
          inst: 6000,
          sigma80: 10,
          sigma20: 5,
          umm: 70,
          tx: month >= 6 && month <= 8 ? 25 : 12
        }),
        HEADER,
        stations
      );
    }
  }

  const summary = summarizeStation(stations.get('00000001'));

  assert.equal(summary.eligible, true);
  assert.equal(summary.metrics.rainfallMmAvg, 600);
  assert.equal(summary.metrics.rainyDaysAvg, 96);
  assert.equal(summary.metrics.hotDays30Avg, 24);
  assert.equal(summary.metrics.windyDaysAvg, 48);
  assert.equal(summary.metrics.sunHoursAvg, 1200);
  assert.equal(summary.metrics.sunnyDaysAvg, 120);
  assert.equal(summary.metrics.cloudyDaysAvg, 60);
  assert.equal(summary.metrics.humidityAvg, 70);
  assert.equal(summary.metrics.summerMaxTempAvg, 25);
  assert.deepEqual(summary.monthlyMetrics.rainfallMmAvg, Array.from({ length: 12 }, () => 50));
  assert.deepEqual(summary.monthlyMetrics.rainyDaysAvg, Array.from({ length: 12 }, () => 8));
  assert.deepEqual(summary.monthlyMetrics.sunHoursAvg, Array.from({ length: 12 }, () => 100));
  assert.deepEqual(summary.monthlyMetrics.windyDaysAvg, Array.from({ length: 12 }, () => 4));
  assert.deepEqual(summary.monthlyMetrics.humidityAvg, Array.from({ length: 12 }, () => 70));
  assert.deepEqual(summary.monthlyMetrics.summerMaxTempAvg, [12, 12, 12, 12, 12, 25, 25, 25, 12, 12, 12, 12]);
  assert.equal(summary.dataCoverage, 100);
});

test('summarizeStation marks station as not eligible when coverage is too low', () => {
  const stations = new Map();

  for (let year = 2015; year <= 2024; year += 1) {
    for (let month = 1; month <= 6; month += 1) {
      processMonthlyLine(
        buildLine({
          year,
          month,
          rr: 20,
          nbjrr1: 3,
          nbjtx30: 0,
          nbjff10: 1,
          inst: 3000,
          sigma80: 8,
          sigma20: 7,
          umm: 80,
          tx: 18
        }),
        HEADER,
        stations
      );
    }
  }

  const summary = summarizeStation(stations.get('00000001'));
  assert.equal(summary.eligible, false);
  assert.ok(summary.dataCoverage < 80);
});

test('selectNearestStation prefers eligible stations and computes distance', () => {
  const city = { lat: 43.6, lon: 1.44 };
  const station = selectNearestStation(city, [
    { stationName: 'Far eligible', lat: 48.8, lon: 2.3, eligible: true, dataCoverage: 99, metrics: { sunnyDaysAvg: 1 } },
    { stationName: 'Near ineligible', lat: 43.61, lon: 1.45, eligible: false, dataCoverage: 50, metrics: { sunnyDaysAvg: 1 } }
  ]);

  assert.equal(station.stationName, 'Far eligible');
  assert.ok(station.distanceKm > 500);
});
