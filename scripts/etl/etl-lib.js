import { SOURCE_PERIOD } from '../../shared/metros.js';

export const REQUIRED_METRICS = [
  'sunnyDays',
  'cloudyDays',
  'rainyDays',
  'rainfallMm',
  'sunHours',
  'hotDays30',
  'windyDays',
  'humidity'
];

export const COVERAGE_RULES = {
  minimumMonthsForAnnualization: 9,
  minimumCoverage: 0.8,
  minimumSummerMonths: 2,
  minimumSummerCoverage: 0.7
};

const MONTH_COUNT = 12;
const METRIC_AGGREGATION = {
  sunnyDays: 'annualized',
  cloudyDays: 'annualized',
  rainyDays: 'annualized',
  rainfallMm: 'annualized',
  sunHours: 'annualized',
  hotDays30: 'annualized',
  windyDays: 'annualized',
  humidity: 'mean'
};

function createAccumulator() {
  return { sum: 0, count: 0 };
}

function createMonthlyAccumulators() {
  return Array.from({ length: MONTH_COUNT }, () => createAccumulator());
}

export function createHeaderIndex(headerLine) {
  return headerLine.split(';').reduce((accumulator, columnName, index) => {
    accumulator[columnName] = index;
    return accumulator;
  }, {});
}

export function parseNumber(rawValue) {
  if (rawValue === undefined || rawValue === null) {
    return null;
  }

  const trimmed = String(rawValue).trim();
  if (!trimmed) {
    return null;
  }

  const normalized = trimmed.replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function getOrCreateStationBucket(stationMap, stationId, input) {
  let station = stationMap.get(stationId);
  if (!station) {
    station = {
      stationId,
      stationName: input.stationName,
      lat: input.lat,
      lon: input.lon,
      monthly: {
        sunnyDays: createMonthlyAccumulators(),
        cloudyDays: createMonthlyAccumulators(),
        rainyDays: createMonthlyAccumulators(),
        rainfallMm: createMonthlyAccumulators(),
        sunHours: createMonthlyAccumulators(),
        hotDays30: createMonthlyAccumulators(),
        windyDays: createMonthlyAccumulators(),
        humidity: createMonthlyAccumulators(),
        tx: createMonthlyAccumulators()
      },
      years: new Map()
    };
    stationMap.set(stationId, station);
  }

  return station;
}

function getOrCreateYearBucket(station, year) {
  let bucket = station.years.get(year);
  if (!bucket) {
    bucket = {
      annual: {
        sunnyDays: { sum: 0, monthCount: 0 },
        cloudyDays: { sum: 0, monthCount: 0 },
        rainyDays: { sum: 0, monthCount: 0 },
        rainfallMm: { sum: 0, monthCount: 0 },
        sunHours: { sum: 0, monthCount: 0 },
        hotDays30: { sum: 0, monthCount: 0 },
        windyDays: { sum: 0, monthCount: 0 },
        humidity: { sum: 0, monthCount: 0 }
      },
      summerTx: {
        sum: 0,
        monthCount: 0
      }
    };
    station.years.set(year, bucket);
  }

  return bucket;
}

function updateAnnualMetric(target, value) {
  if (value === null) {
    return;
  }

  target.sum += value;
  target.monthCount += 1;
}

function updateMonthlyMetric(accumulators, month, value) {
  if (value === null || month < 1 || month > MONTH_COUNT) {
    return;
  }

  const target = accumulators[month - 1];
  target.sum += value;
  target.count += 1;
}

export function processMonthlyLine(line, headerIndex, stationMap, sourcePeriod = SOURCE_PERIOD) {
  const columns = line.split(';');
  const aaaamm = Number.parseInt(columns[headerIndex.AAAAMM], 10);
  if (!Number.isFinite(aaaamm)) {
    return;
  }

  const year = Math.floor(aaaamm / 100);
  const month = aaaamm % 100;
  if (year < sourcePeriod.startYear || year > sourcePeriod.endYear) {
    return;
  }

  const station = getOrCreateStationBucket(stationMap, columns[headerIndex.NUM_POSTE], {
    stationName: columns[headerIndex.NOM_USUEL],
    lat: Number.parseFloat(columns[headerIndex.LAT]),
    lon: Number.parseFloat(columns[headerIndex.LON])
  });

  const yearBucket = getOrCreateYearBucket(station, year);
  const rainfallMm = parseNumber(columns[headerIndex.RR]);
  const rainyDays = parseNumber(columns[headerIndex.NBJRR1]);
  const hotDays30 = parseNumber(columns[headerIndex.NBJTX30]);
  const windyDays = parseNumber(columns[headerIndex.NBJFF10]);
  const sunHours = parseNumber(columns[headerIndex.INST]);
  const sunnyDays = parseNumber(columns[headerIndex.NBSIGMA80]);
  const cloudyDays = parseNumber(columns[headerIndex.NBSIGMA20]);
  const humidity = parseNumber(columns[headerIndex.UMM]);
  const tx = parseNumber(columns[headerIndex.TX]);

  updateAnnualMetric(yearBucket.annual.rainfallMm, rainfallMm);
  updateAnnualMetric(yearBucket.annual.rainyDays, rainyDays);
  updateAnnualMetric(yearBucket.annual.hotDays30, hotDays30);
  updateAnnualMetric(yearBucket.annual.windyDays, windyDays);
  updateAnnualMetric(yearBucket.annual.sunHours, sunHours);
  updateAnnualMetric(yearBucket.annual.sunnyDays, sunnyDays);
  updateAnnualMetric(yearBucket.annual.cloudyDays, cloudyDays);
  updateAnnualMetric(yearBucket.annual.humidity, humidity);

  updateMonthlyMetric(station.monthly.rainfallMm, month, rainfallMm);
  updateMonthlyMetric(station.monthly.rainyDays, month, rainyDays);
  updateMonthlyMetric(station.monthly.hotDays30, month, hotDays30);
  updateMonthlyMetric(station.monthly.windyDays, month, windyDays);
  updateMonthlyMetric(station.monthly.sunHours, month, sunHours);
  updateMonthlyMetric(station.monthly.sunnyDays, month, sunnyDays);
  updateMonthlyMetric(station.monthly.cloudyDays, month, cloudyDays);
  updateMonthlyMetric(station.monthly.humidity, month, humidity);
  updateMonthlyMetric(station.monthly.tx, month, tx);

  if (month >= 6 && month <= 8) {
    if (tx !== null) {
      yearBucket.summerTx.sum += tx;
      yearBucket.summerTx.monthCount += 1;
    }
  }
}

function mean(values) {
  if (!values.length) {
    return null;
  }

  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
}

function toCoverageRatio(monthCounts, expectedMonthCount) {
  const totalExpectedMonths = expectedMonthCount * (SOURCE_PERIOD.endYear - SOURCE_PERIOD.startYear + 1);
  if (!totalExpectedMonths) {
    return 0;
  }

  return monthCounts.reduce((sum, value) => sum + value, 0) / totalExpectedMonths;
}

function summarizeAnnualMetric(station, metricKey, rules = COVERAGE_RULES) {
  const annualValues = [];
  const monthCounts = [];
  const aggregation = METRIC_AGGREGATION[metricKey] ?? 'annualized';

  for (let year = SOURCE_PERIOD.startYear; year <= SOURCE_PERIOD.endYear; year += 1) {
    const yearBucket = station.years.get(year);
    const annualMetric = yearBucket?.annual[metricKey];
    const monthCount = annualMetric?.monthCount ?? 0;
    monthCounts.push(monthCount);

    if (monthCount >= rules.minimumMonthsForAnnualization) {
      annualValues.push(
        aggregation === 'mean' ? annualMetric.sum / monthCount : (annualMetric.sum * 12) / monthCount
      );
    }
  }

  return {
    value: mean(annualValues),
    coverage: toCoverageRatio(monthCounts, 12)
  };
}

function summarizeSummerTemperature(station, rules = COVERAGE_RULES) {
  const annualValues = [];
  const monthCounts = [];

  for (let year = SOURCE_PERIOD.startYear; year <= SOURCE_PERIOD.endYear; year += 1) {
    const yearBucket = station.years.get(year);
    const summerBucket = yearBucket?.summerTx;
    const monthCount = summerBucket?.monthCount ?? 0;
    monthCounts.push(monthCount);

    if (monthCount >= rules.minimumSummerMonths) {
      annualValues.push(summerBucket.sum / monthCount);
    }
  }

  return {
    value: mean(annualValues),
    coverage: toCoverageRatio(monthCounts, 3)
  };
}

function summarizeMonthlyMetric(accumulators, transform = (value) => value) {
  return accumulators.map((bucket) => {
    if (!bucket.count) {
      return null;
    }

    return roundMetric(transform(bucket.sum / bucket.count));
  });
}

function roundMetric(value, decimals = 1) {
  if (value === null) {
    return null;
  }

  return Number.parseFloat(value.toFixed(decimals));
}

export function summarizeStation(station, rules = COVERAGE_RULES) {
  const annualMetrics = Object.fromEntries(
    REQUIRED_METRICS.map((metricKey) => [metricKey, summarizeAnnualMetric(station, metricKey, rules)])
  );
  const summer = summarizeSummerTemperature(station, rules);
  const coverageValues = [...Object.values(annualMetrics).map((metric) => metric.coverage), summer.coverage];
  const minimumCoverage = Math.min(...coverageValues);

  const hasRequiredValues = Object.values(annualMetrics).every((metric) => metric.value !== null) && summer.value !== null;
  const eligible =
    hasRequiredValues &&
    Object.values(annualMetrics).every((metric) => metric.coverage >= rules.minimumCoverage) &&
    summer.coverage >= rules.minimumSummerCoverage;

  return {
    stationId: station.stationId,
    stationName: station.stationName,
    lat: station.lat,
    lon: station.lon,
    eligible,
    dataCoverage: roundMetric(minimumCoverage * 100, 1),
    metrics: {
      sunnyDaysAvg: roundMetric(annualMetrics.sunnyDays.value),
      cloudyDaysAvg: roundMetric(annualMetrics.cloudyDays.value),
      rainyDaysAvg: roundMetric(annualMetrics.rainyDays.value),
      rainfallMmAvg: roundMetric(annualMetrics.rainfallMm.value),
      sunHoursAvg: roundMetric(annualMetrics.sunHours.value !== null ? annualMetrics.sunHours.value / 60 : null),
      hotDays30Avg: roundMetric(annualMetrics.hotDays30.value),
      windyDaysAvg: roundMetric(annualMetrics.windyDays.value),
      humidityAvg: roundMetric(annualMetrics.humidity.value),
      summerMaxTempAvg: roundMetric(summer.value)
    },
    monthlyMetrics: {
      sunnyDaysAvg: summarizeMonthlyMetric(station.monthly.sunnyDays),
      cloudyDaysAvg: summarizeMonthlyMetric(station.monthly.cloudyDays),
      rainyDaysAvg: summarizeMonthlyMetric(station.monthly.rainyDays),
      rainfallMmAvg: summarizeMonthlyMetric(station.monthly.rainfallMm),
      sunHoursAvg: summarizeMonthlyMetric(station.monthly.sunHours, (value) => value / 60),
      hotDays30Avg: summarizeMonthlyMetric(station.monthly.hotDays30),
      windyDaysAvg: summarizeMonthlyMetric(station.monthly.windyDays),
      humidityAvg: summarizeMonthlyMetric(station.monthly.humidity),
      summerMaxTempAvg: summarizeMonthlyMetric(station.monthly.tx)
    }
  };
}

export function haversineKm(from, to) {
  const earthRadiusKm = 6371;
  const toRadians = (value) => (value * Math.PI) / 180;
  const deltaLat = toRadians(to.lat - from.lat);
  const deltaLon = toRadians(to.lon - from.lon);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function selectNearestStation(city, stations, allowFallback = true) {
  const eligibleStations = stations.filter((station) => station.eligible);
  const pool = eligibleStations.length ? eligibleStations : allowFallback ? stations : [];

  return pool
    .map((station) => ({
      ...station,
      distanceKm: haversineKm(city, station)
    }))
    .sort((left, right) => left.distanceKm - right.distanceKm)[0] ?? null;
}
