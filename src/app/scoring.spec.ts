import { describe, expect, it } from 'vitest';
import { getInitialCriteria, scoreCities } from './scoring';
import { ApiMeta, CityMetric } from './types';

const alphaMonthlyMetrics = {
  sunnyDaysAvg: [10, 11, 13, 16, 19, 22, 24, 23, 18, 15, 11, 9],
  rainyDaysAvg: [12, 11, 10, 9, 8, 6, 5, 5, 7, 9, 11, 12],
  cloudyDaysAvg: [13, 12, 10, 8, 6, 4, 3, 3, 5, 8, 10, 12],
  rainfallMmAvg: [88, 72, 65, 61, 59, 48, 37, 41, 56, 69, 79, 85],
  sunHoursAvg: [102, 120, 154, 182, 215, 248, 270, 261, 212, 168, 118, 101],
  hotDays30Avg: [0, 0, 0, 1, 2, 4, 7, 8, 3, 1, 0, 0],
  windyDaysAvg: [13, 12, 12, 11, 10, 9, 8, 8, 10, 11, 12, 14],
  uvIndexAvg: [1.1, 1.5, 2.4, 3.3, 4.5, 5.5, 5.9, 5.1, 3.7, 2.3, 1.4, 1.0],
  humidityAvg: [74, 72, 69, 66, 65, 62, 60, 61, 65, 70, 73, 75],
  summerMaxTempAvg: [13, 15, 18, 21, 24, 27, 29, 29, 25, 21, 17, 14]
};

const betaMonthlyMetrics = {
  sunnyDaysAvg: [6, 7, 9, 11, 13, 15, 17, 16, 13, 10, 8, 6],
  rainyDaysAvg: [11, 10, 9, 8, 8, 7, 6, 6, 7, 8, 10, 11],
  cloudyDaysAvg: [14, 13, 11, 9, 8, 6, 5, 5, 7, 9, 12, 13],
  rainfallMmAvg: [92, 80, 73, 68, 64, 52, 44, 47, 60, 74, 84, 90],
  sunHoursAvg: [88, 104, 132, 158, 184, 213, 234, 225, 180, 141, 96, 82],
  hotDays30Avg: [0, 0, 0, 0, 1, 2, 4, 4, 1, 0, 0, 0],
  windyDaysAvg: [9, 8, 8, 7, 7, 6, 6, 6, 7, 8, 8, 10],
  uvIndexAvg: [0.8, 1.2, 1.9, 2.8, 3.8, 4.6, 4.9, 4.1, 3.0, 1.8, 1.1, 0.8],
  humidityAvg: [81, 79, 77, 74, 73, 70, 69, 70, 74, 78, 80, 82],
  summerMaxTempAvg: [11, 13, 15, 18, 21, 24, 27, 27, 23, 19, 15, 12]
};

const meta: ApiMeta = {
  ready: true,
  rowCount: 2,
  generatedAt: '2026-03-29T12:00:00.000Z',
  sourcePeriod: { startYear: 2015, endYear: 2024 },
  criteria: [
    {
      key: 'sunnyDaysAvg',
      label: 'Soleil',
      shortLabel: 'Soleil',
      unit: 'j/an',
      description: '',
      source: 'Météo-France',
      coverage: '2015-2024'
    },
    {
      key: 'rainyDaysAvg',
      label: 'Pluie',
      shortLabel: 'Pluie',
      unit: 'j/an',
      description: '',
      source: 'Météo-France',
      coverage: '2015-2024'
    },
    {
      key: 'cloudyDaysAvg',
      label: 'Nuages',
      shortLabel: 'Nuages',
      unit: 'j/an',
      description: '',
      source: 'Météo-France',
      coverage: '2015-2024'
    },
    {
      key: 'rainfallMmAvg',
      label: 'Mm',
      shortLabel: 'Mm',
      unit: 'mm/an',
      description: '',
      source: 'Météo-France',
      coverage: '2015-2024'
    },
    {
      key: 'sunHoursAvg',
      label: 'Heures',
      shortLabel: 'Heures',
      unit: 'h/an',
      description: '',
      source: 'Météo-France',
      coverage: '2015-2024'
    },
    {
      key: 'hotDays30Avg',
      label: 'Chaud',
      shortLabel: 'Chaud',
      unit: 'j/an',
      description: '',
      source: 'Météo-France',
      coverage: '2015-2024'
    },
    {
      key: 'windyDaysAvg',
      label: 'Vent',
      shortLabel: 'Vent',
      unit: 'j/an',
      description: '',
      source: 'Météo-France',
      coverage: '2015-2024'
    },
    {
      key: 'uvIndexAvg',
      label: 'UV',
      shortLabel: 'UV',
      unit: 'indice',
      description: '',
      source: 'Open-Meteo historical forecast',
      coverage: '2022-2024'
    },
    {
      key: 'humidityAvg',
      label: 'Humidité',
      shortLabel: 'Humidité',
      unit: '%',
      description: '',
      source: 'Météo-France',
      coverage: '2015-2024'
    },
    {
      key: 'summerMaxTempAvg',
      label: 'Été',
      shortLabel: 'Été',
      unit: '°C',
      description: '',
      source: 'Météo-France',
      coverage: '2015-2024'
    }
  ],
  presets: [
    {
      id: 'default',
      label: 'Default',
      isDefault: true,
      criteria: {
        sunnyDaysAvg: { enabled: true, weight: 10, direction: 'minimize' },
        rainyDaysAvg: { enabled: false, weight: 0, direction: 'minimize' },
        cloudyDaysAvg: { enabled: false, weight: 0, direction: 'maximize' },
        rainfallMmAvg: { enabled: false, weight: 0, direction: 'minimize' },
        sunHoursAvg: { enabled: false, weight: 0, direction: 'minimize' },
        hotDays30Avg: { enabled: false, weight: 0, direction: 'minimize' },
        windyDaysAvg: { enabled: false, weight: 0, direction: 'minimize' },
        uvIndexAvg: { enabled: false, weight: 0, direction: 'minimize' },
        humidityAvg: { enabled: false, weight: 0, direction: 'minimize' },
        summerMaxTempAvg: { enabled: false, weight: 0, direction: 'minimize' }
      }
    }
  ],
  notes: []
};

const cities: CityMetric[] = [
  {
    slug: 'a',
    name: 'Alpha',
    region: 'Region A',
    metroPopulation: 100000,
    sunnyDaysAvg: 200,
    rainyDaysAvg: 100,
    cloudyDaysAvg: 50,
    rainfallMmAvg: 700,
    sunHoursAvg: 2100,
    hotDays30Avg: 20,
    windyDaysAvg: 140,
    uvIndexAvg: 3.2,
    humidityAvg: 64,
    summerMaxTempAvg: 28,
    monthlyMetrics: alphaMonthlyMetrics,
    stationName: 'A',
    stationDistanceKm: 10,
    dataCoverage: 99
  },
  {
    slug: 'b',
    name: 'Beta',
    region: 'Region B',
    metroPopulation: 120000,
    sunnyDaysAvg: 120,
    rainyDaysAvg: 100,
    cloudyDaysAvg: 50,
    rainfallMmAvg: 700,
    sunHoursAvg: 2100,
    hotDays30Avg: 20,
    windyDaysAvg: 90,
    uvIndexAvg: 2.1,
    humidityAvg: 76,
    summerMaxTempAvg: 28,
    monthlyMetrics: betaMonthlyMetrics,
    stationName: 'B',
    stationDistanceKm: 20,
    dataCoverage: 99
  }
];

describe('scoreCities', () => {
  it('favors lower values when a criterion is minimized', () => {
    const criteria = getInitialCriteria(meta);
    const ranked = scoreCities(cities, criteria, meta);

    expect(ranked.find((city) => city.slug === 'a')?.score).toBe(0);
    expect(ranked.find((city) => city.slug === 'b')?.score).toBe(100);
  });

  it('can score a filtered subset against the full city set', () => {
    const criteria = getInitialCriteria(meta);
    const ranked = scoreCities([cities[0]], criteria, meta, cities);

    expect(ranked[0].score).toBe(0);
  });
});
