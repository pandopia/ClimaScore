import fs from 'node:fs';
import path from 'node:path';
import { createReadStream, createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { createGunzip } from 'node:zlib';
import { METRO_AREAS, SOURCE_PERIOD } from '../../shared/metros.js';
import { createHeaderIndex, processMonthlyLine, selectNearestStation, summarizeStation } from './etl-lib.js';
import { buildDashboardData } from './meta.js';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const CACHE_DIR = path.join(DATA_DIR, 'cache', 'meteo-france');
const OPEN_METEO_CACHE_PATH = path.join(DATA_DIR, 'cache', 'open-meteo', 'uv-index-avg.json');
const DASHBOARD_PATH = path.join(ROOT_DIR, 'public', 'data', 'dashboard.json');
const UV_SOURCE_PERIOD = {
  startYear: Math.max(SOURCE_PERIOD.startYear, 2022),
  endYear: SOURCE_PERIOD.endYear
};
const UV_BATCH_SIZE = 1;
const MONTH_COUNT = 12;

const REFRESH = process.argv.includes('--refresh');

function buildMetropolitanDepartmentCodes() {
  const departmentCodes = [];
  for (let departmentNumber = 1; departmentNumber <= 95; departmentNumber += 1) {
    departmentCodes.push(String(departmentNumber).padStart(2, '0'));
  }

  return departmentCodes;
}

function normalizeText(value) {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function mean(values) {
  if (!values.length) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function roundMetric(value, decimals = 1) {
  if (value === null) {
    return null;
  }

  return Number.parseFloat(value.toFixed(decimals));
}

function roundMonthlySeries(values) {
  return values.map((value) => (value === null ? null : roundMetric(value)));
}

function sleep(delayMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

async function fetchJson(url, { retries = 0 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const response = await fetch(url);
    if (response.ok) {
      return response.json();
    }

    const retryAfterHeader = response.headers.get('retry-after');
    const retryAfterSeconds = retryAfterHeader ? Number.parseInt(retryAfterHeader, 10) : null;
    const canRetry = (response.status === 429 || response.status >= 500) && attempt < retries;

    if (canRetry) {
      const waitMs = Number.isFinite(retryAfterSeconds) ? retryAfterSeconds * 1000 : 1500 * (attempt + 1);
      await sleep(waitMs);
      continue;
    }

    throw new Error(`Echec HTTP ${response.status} sur ${url}`);
  }
}

async function downloadFile(url, destinationPath) {
  fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
  if (!REFRESH && fs.existsSync(destinationPath)) {
    return destinationPath;
  }

  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Impossible de telecharger ${url}`);
  }

  await pipeline(Readable.fromWeb(response.body), createWriteStream(destinationPath));
  return destinationPath;
}

function buildDepartmentUrl(departmentCode) {
  return `https://object.files.data.gouv.fr/meteofrance/data/synchro_ftp/BASE/MENS/MENSQ_${departmentCode}_previous-1950-2024.csv.gz`;
}

async function ingestDepartmentFile(filePath, stationMap) {
  const input = createReadStream(filePath).pipe(createGunzip());
  const reader = createInterface({
    input,
    crlfDelay: Infinity
  });

  let headerIndex = null;
  for await (const line of reader) {
    if (!headerIndex) {
      headerIndex = createHeaderIndex(line);
      continue;
    }

    processMonthlyLine(line, headerIndex, stationMap, SOURCE_PERIOD);
  }
}

async function resolveCommune(metro) {
  const queryVariants = [
    `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(metro.coreCityName)}&codeDepartement=${metro.departmentCode}&fields=nom,code,centre,departement,region,population&boost=population&limit=5`,
    `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(metro.coreCityName)}&fields=nom,code,centre,departement,region,population&boost=population&limit=5`
  ];

  for (const queryUrl of queryVariants) {
    const candidates = await fetchJson(queryUrl);
    if (!Array.isArray(candidates) || !candidates.length) {
      continue;
    }

    const normalizedTarget = normalizeText(metro.coreCityName);
    const exactMatch =
      candidates.find((candidate) => normalizeText(candidate.nom) === normalizedTarget) ?? candidates[0];

    if (exactMatch?.centre?.coordinates?.length === 2) {
      return {
        ...metro,
        coreCityName: exactMatch.nom,
        region: exactMatch.region.nom,
        lat: exactMatch.centre.coordinates[1],
        lon: exactMatch.centre.coordinates[0]
      };
    }
  }

  throw new Error(`Impossible de resoudre ${metro.coreCityName}`);
}

function loadUvCache() {
  if (REFRESH || !fs.existsSync(OPEN_METEO_CACHE_PATH)) {
    return new Map();
  }

  try {
    const payload = JSON.parse(fs.readFileSync(OPEN_METEO_CACHE_PATH, 'utf8'));
    if (
      payload?.source !== 'open-meteo-historical-forecast' ||
      payload?.metric !== 'uv_index_daylight_mean_monthly' ||
      payload?.startYear !== UV_SOURCE_PERIOD.startYear ||
      payload?.endYear !== UV_SOURCE_PERIOD.endYear
    ) {
      return new Map();
    }

    return new Map(
      Object.entries(payload.values ?? {}).flatMap(([stationId, stationValue]) =>
        Number.isFinite(stationValue?.uvIndexAvg) && Array.isArray(stationValue?.monthlyUvIndexAvg)
          ? [
              [
                stationId,
                {
                  uvIndexAvg: stationValue.uvIndexAvg,
                  monthlyUvIndexAvg: roundMonthlySeries(
                    Array.from({ length: MONTH_COUNT }, (_value, index) =>
                      Number.isFinite(stationValue.monthlyUvIndexAvg[index]) ? stationValue.monthlyUvIndexAvg[index] : null
                    )
                  )
                }
              ]
            ]
          : []
      )
    );
  } catch {
    return new Map();
  }
}

function saveUvCache(uvByStationId, stationById) {
  fs.mkdirSync(path.dirname(OPEN_METEO_CACHE_PATH), { recursive: true });

  const values = Object.fromEntries(
    Array.from(uvByStationId.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([stationId, uvProfile]) => [
        stationId,
        {
          stationName: stationById.get(stationId)?.stationName ?? null,
          lat: stationById.get(stationId)?.lat ?? null,
          lon: stationById.get(stationId)?.lon ?? null,
          uvIndexAvg: uvProfile.uvIndexAvg,
          monthlyUvIndexAvg: uvProfile.monthlyUvIndexAvg
        }
      ])
  );

  fs.writeFileSync(
    OPEN_METEO_CACHE_PATH,
    JSON.stringify(
      {
        source: 'open-meteo-historical-forecast',
        metric: 'uv_index_daylight_mean_monthly',
        startYear: UV_SOURCE_PERIOD.startYear,
        endYear: UV_SOURCE_PERIOD.endYear,
        updatedAt: new Date().toISOString(),
        values
      },
      null,
      2
    )
  );
}

async function fetchUvIndexAverage(station) {
  const params = new URLSearchParams({
    latitude: String(station.lat),
    longitude: String(station.lon),
    start_date: `${UV_SOURCE_PERIOD.startYear}-01-01`,
    end_date: `${UV_SOURCE_PERIOD.endYear}-12-31`,
    hourly: 'uv_index,is_day',
    timezone: 'GMT'
  });
  const payload = await fetchJson(`https://historical-forecast-api.open-meteo.com/v1/forecast?${params}`, {
    retries: 4
  });
  const timestamps = payload?.hourly?.time;
  const values = payload?.hourly?.uv_index;
  const isDay = payload?.hourly?.is_day;
  const monthlyBuckets = Array.from({ length: MONTH_COUNT }, () => []);
  const numericValues = [];

  if (Array.isArray(timestamps) && Array.isArray(values) && Array.isArray(isDay)) {
    values.forEach((value, index) => {
      if (isDay[index] !== 1 || !Number.isFinite(value)) {
        return;
      }

      numericValues.push(value);
      const month = Number.parseInt(String(timestamps[index]).slice(5, 7), 10);
      if (month >= 1 && month <= MONTH_COUNT) {
        monthlyBuckets[month - 1].push(value);
      }
    });
  }

  const average = mean(numericValues);
  if (average === null) {
    throw new Error(`Aucune valeur UV exploitable pour ${station.stationName}`);
  }

  return {
    uvIndexAvg: roundMetric(average),
    monthlyUvIndexAvg: roundMonthlySeries(monthlyBuckets.map((bucket) => mean(bucket)))
  };
}

function selectMetroStations(metros, stations) {
  return metros.map((metro) => {
    const nearestStation = selectNearestStation(metro, stations);
    if (!nearestStation) {
      throw new Error(`Aucune station trouvee pour ${metro.name}`);
    }

    return {
      ...metro,
      nearestStation
    };
  });
}

async function computeUvByStation(selectedMetros) {
  if (UV_SOURCE_PERIOD.endYear < UV_SOURCE_PERIOD.startYear) {
    throw new Error('La periode UV est invalide.');
  }

  const stationById = new Map(selectedMetros.map((metro) => [metro.nearestStation.stationId, metro.nearestStation]));
  const uvByStationId = loadUvCache();
  const missingStations = Array.from(stationById.values()).filter((station) => !uvByStationId.has(station.stationId));

  if (!missingStations.length) {
    return uvByStationId;
  }

  for (let startIndex = 0; startIndex < missingStations.length; startIndex += UV_BATCH_SIZE) {
    const batch = missingStations.slice(startIndex, startIndex + UV_BATCH_SIZE);
    await Promise.all(
      batch.map(async (station) => {
        uvByStationId.set(station.stationId, await fetchUvIndexAverage(station));
      })
    );
    saveUvCache(uvByStationId, stationById);
  }

  return uvByStationId;
}

function prepareCities(selectedMetros, uvByStationId) {
  return selectedMetros
    .map((metro) => {
      const nearestStation = metro.nearestStation;
      const uvProfile = uvByStationId.get(nearestStation.stationId);
      if (!Number.isFinite(uvProfile?.uvIndexAvg)) {
        throw new Error(`Indice UV introuvable pour ${nearestStation.stationName}`);
      }

      return {
        slug: metro.slug,
        name: metro.name,
        region: metro.region,
        metroPopulation: metro.metroPopulation,
        stationName: nearestStation.stationName,
        stationDistanceKm: Number.parseFloat(nearestStation.distanceKm.toFixed(1)),
        dataCoverage: nearestStation.dataCoverage,
        uvIndexAvg: uvProfile.uvIndexAvg,
        ...nearestStation.metrics,
        monthlyMetrics: {
          ...nearestStation.monthlyMetrics,
          uvIndexAvg: uvProfile.monthlyUvIndexAvg
        }
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name, 'fr'));
}

export function buildDashboardPayload({ generatedAt, cities, sourcePeriod = SOURCE_PERIOD }) {
  return buildDashboardData({
    generatedAt,
    sourcePeriod,
    cities
  });
}

export async function runEtl() {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(DASHBOARD_PATH), { recursive: true });

  console.log('Resolution des agglomerations...');
  const metros = await Promise.all(METRO_AREAS.map(resolveCommune));

  console.log('Telechargement des fichiers Meteo-France...');
  const departmentCodes = buildMetropolitanDepartmentCodes();
  const cachedFiles = [];
  for (const departmentCode of departmentCodes) {
    const destinationPath = path.join(CACHE_DIR, `MENSQ_${departmentCode}_previous-1950-2024.csv.gz`);
    cachedFiles.push(await downloadFile(buildDepartmentUrl(departmentCode), destinationPath));
  }

  console.log('Aggregation des stations...');
  const stationMap = new Map();
  for (const filePath of cachedFiles) {
    await ingestDepartmentFile(filePath, stationMap);
  }

  const stations = Array.from(stationMap.values())
    .map((station) => summarizeStation(station))
    .filter((station) => Object.values(station.metrics).every((value) => value !== null));

  if (!stations.length) {
    throw new Error('Aucune station exploitable apres aggregation');
  }

  console.log(`Stations candidates: ${stations.length}`);
  console.log(`Calcul de l’indice UV moyen (${UV_SOURCE_PERIOD.startYear}-${UV_SOURCE_PERIOD.endYear})...`);

  const selectedMetros = selectMetroStations(metros, stations);
  const uvByStationId = await computeUvByStation(selectedMetros);
  const generatedAt = new Date().toISOString();
  const cities = prepareCities(selectedMetros, uvByStationId);
  const dashboard = buildDashboardPayload({
    generatedAt,
    cities
  });

  fs.writeFileSync(DASHBOARD_PATH, JSON.stringify(dashboard, null, 2));

  console.log(`Dashboard ecrit: ${dashboard.cities.length} villes.`);
  console.log(`Fichier genere dans ${DASHBOARD_PATH}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runEtl().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
