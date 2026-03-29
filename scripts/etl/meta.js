export function buildCriteria(sourcePeriod) {
  const meteoFranceCoverage = `${sourcePeriod.startYear}-${sourcePeriod.endYear}`;
  const uvCoverage = `${Math.max(sourcePeriod.startYear, 2022)}-${sourcePeriod.endYear}`;

  return [
    {
      key: 'sunnyDaysAvg',
      label: 'Jours très ensoleillés',
      shortLabel: 'Soleil',
      unit: 'j/an',
      description: 'Nombre moyen annuel de jours avec fraction d’ensoleillement >= 80%.',
      source: 'Météo-France, station météo la plus proche',
      coverage: meteoFranceCoverage
    },
    {
      key: 'rainyDaysAvg',
      label: 'Jours de pluie',
      shortLabel: 'Pluie',
      unit: 'j/an',
      description: 'Nombre moyen annuel de jours avec précipitation >= 1 mm.',
      source: 'Météo-France, station météo la plus proche',
      coverage: meteoFranceCoverage
    },
    {
      key: 'cloudyDaysAvg',
      label: 'Jours très nuageux',
      shortLabel: 'Nuages',
      unit: 'j/an',
      description: 'Estimation des journées très couvertes à partir d’un faible ensoleillement.',
      source: 'Météo-France, proxy dérivé de l’ensoleillement',
      coverage: meteoFranceCoverage
    },
    {
      key: 'rainfallMmAvg',
      label: 'Pluviométrie annuelle',
      shortLabel: 'Mm pluie',
      unit: 'mm/an',
      description: 'Cumul moyen annuel des précipitations.',
      source: 'Météo-France, station météo la plus proche',
      coverage: meteoFranceCoverage
    },
    {
      key: 'sunHoursAvg',
      label: 'Heures d’ensoleillement',
      shortLabel: 'Heures soleil',
      unit: 'h/an',
      description: 'Cumul moyen annuel d’insolation.',
      source: 'Météo-France, station météo la plus proche',
      coverage: meteoFranceCoverage
    },
    {
      key: 'hotDays30Avg',
      label: 'Jours >= 30°C',
      shortLabel: 'Jours chauds',
      unit: 'j/an',
      description: 'Nombre moyen annuel de jours avec température maximale >= 30°C.',
      source: 'Météo-France, station météo la plus proche',
      coverage: meteoFranceCoverage
    },
    {
      key: 'windyDaysAvg',
      label: 'Jours venteux',
      shortLabel: 'Vent',
      unit: 'j/an',
      description: 'Nombre moyen annuel de jours avec vent moyen >= 10 m/s.',
      source: 'Météo-France, station météo la plus proche',
      coverage: meteoFranceCoverage
    },
    {
      key: 'uvIndexAvg',
      label: 'Indice UV moyen',
      shortLabel: 'UV',
      unit: 'indice',
      description: 'Moyenne des valeurs horaires d’indice UV pendant les heures de jour.',
      source: 'Open-Meteo historical forecast',
      coverage: uvCoverage
    },
    {
      key: 'humidityAvg',
      label: 'Humidité moyenne',
      shortLabel: 'Humidité',
      unit: '%',
      description: 'Humidité relative moyenne.',
      source: 'Météo-France, station météo la plus proche',
      coverage: meteoFranceCoverage
    },
    {
      key: 'summerMaxTempAvg',
      label: 'Max moyenne été',
      shortLabel: 'Max été',
      unit: '°C',
      description: 'Moyenne des températures maximales mensuelles de juin à août.',
      source: 'Météo-France, station météo la plus proche',
      coverage: meteoFranceCoverage
    }
  ];
}

export const BUILTIN_SCORE_PRESETS = [
  {
    id: 'sun-lover',
    label: 'Sun lover',
    isDefault: true,
    criteria: {
      sunnyDaysAvg: { enabled: true, weight: 10, direction: 'maximize' },
      rainyDaysAvg: { enabled: true, weight: 6, direction: 'minimize' },
      cloudyDaysAvg: { enabled: true, weight: 9, direction: 'minimize' },
      rainfallMmAvg: { enabled: true, weight: 5, direction: 'minimize' },
      sunHoursAvg: { enabled: true, weight: 10, direction: 'maximize' },
      hotDays30Avg: { enabled: true, weight: 6, direction: 'maximize' },
      windyDaysAvg: { enabled: true, weight: 3, direction: 'minimize' },
      uvIndexAvg: { enabled: true, weight: 7, direction: 'maximize' },
      humidityAvg: { enabled: true, weight: 4, direction: 'minimize' },
      summerMaxTempAvg: { enabled: true, weight: 7, direction: 'maximize' }
    }
  },
  {
    id: 'pluviophile',
    label: 'Pluviophile',
    isDefault: false,
    criteria: {
      sunnyDaysAvg: { enabled: true, weight: 7, direction: 'minimize' },
      rainyDaysAvg: { enabled: true, weight: 10, direction: 'maximize' },
      cloudyDaysAvg: { enabled: true, weight: 8, direction: 'maximize' },
      rainfallMmAvg: { enabled: true, weight: 10, direction: 'maximize' },
      sunHoursAvg: { enabled: true, weight: 7, direction: 'minimize' },
      hotDays30Avg: { enabled: true, weight: 6, direction: 'minimize' },
      windyDaysAvg: { enabled: true, weight: 3, direction: 'minimize' },
      uvIndexAvg: { enabled: true, weight: 5, direction: 'minimize' },
      humidityAvg: { enabled: true, weight: 8, direction: 'maximize' },
      summerMaxTempAvg: { enabled: true, weight: 7, direction: 'minimize' }
    }
  }
];

export function buildNotes(sourcePeriod) {
  return [
    'Les jours nuageux sont une estimation basée sur le manque d’ensoleillement, pas sur une mesure directe des nuages.',
    'Les jours venteux comptent les journées où le vent moyen reste soutenu.',
    'L’humidité correspond à l’humidité relative moyenne.',
    `L’indice UV moyen est calculé sur les heures de jour et couvre la période ${Math.max(sourcePeriod.startYear, 2022)}-${sourcePeriod.endYear}.`
  ];
}

export function buildDashboardData({ generatedAt = null, sourcePeriod, cities }) {
  return {
    generatedAt,
    sourcePeriod,
    criteria: buildCriteria(sourcePeriod),
    notes: buildNotes(sourcePeriod),
    presets: BUILTIN_SCORE_PRESETS,
    cities
  };
}
