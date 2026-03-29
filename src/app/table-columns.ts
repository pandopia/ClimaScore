import { CriterionDefinition, SortKey, TableColumnKey } from './types';

export interface TableColumnDefinition {
  key: TableColumnKey;
  label: string;
  sortKey?: SortKey;
  fractionDigits?: number;
}

export const TABLE_COLUMNS: TableColumnKey[] = [
  'favorite',
  'name',
  'region',
  'metroPopulation',
  'score',
  'sunnyDaysAvg',
  'rainyDaysAvg',
  'cloudyDaysAvg',
  'rainfallMmAvg',
  'sunHoursAvg',
  'hotDays30Avg',
  'windyDaysAvg',
  'uvIndexAvg',
  'humidityAvg',
  'summerMaxTempAvg'
];

export const TABLE_COLUMN_DEFINITIONS: TableColumnDefinition[] = [
  { key: 'favorite', label: 'Fav', sortKey: 'favorite' },
  { key: 'name', label: 'Ville', sortKey: 'name' },
  { key: 'region', label: 'Région', sortKey: 'region' },
  { key: 'metroPopulation', label: 'Population', sortKey: 'metroPopulation' },
  { key: 'score', label: 'Score', sortKey: 'score' },
  { key: 'sunnyDaysAvg', label: 'Soleil', sortKey: 'sunnyDaysAvg', fractionDigits: 1 },
  { key: 'rainyDaysAvg', label: 'Pluie', sortKey: 'rainyDaysAvg', fractionDigits: 1 },
  { key: 'cloudyDaysAvg', label: 'Nuages', sortKey: 'cloudyDaysAvg', fractionDigits: 1 },
  { key: 'rainfallMmAvg', label: 'Mm/an', sortKey: 'rainfallMmAvg', fractionDigits: 1 },
  { key: 'sunHoursAvg', label: 'Heures', sortKey: 'sunHoursAvg', fractionDigits: 1 },
  { key: 'hotDays30Avg', label: 'Jours 30+', sortKey: 'hotDays30Avg', fractionDigits: 1 },
  { key: 'windyDaysAvg', label: 'Vent', sortKey: 'windyDaysAvg', fractionDigits: 1 },
  { key: 'uvIndexAvg', label: 'UV', sortKey: 'uvIndexAvg', fractionDigits: 1 },
  { key: 'humidityAvg', label: 'Humidité', sortKey: 'humidityAvg', fractionDigits: 1 },
  { key: 'summerMaxTempAvg', label: 'Max été', sortKey: 'summerMaxTempAvg', fractionDigits: 1 }
];

const COLUMN_LABELS: Record<TableColumnKey, string> = {
  favorite: 'favoris',
  name: 'ville',
  region: 'région',
  metroPopulation: 'population',
  score: 'score',
  sunnyDaysAvg: 'soleil',
  rainyDaysAvg: 'pluie',
  cloudyDaysAvg: 'nuages',
  rainfallMmAvg: 'pluie annuelle',
  sunHoursAvg: 'heures de soleil',
  hotDays30Avg: 'jours 30+',
  windyDaysAvg: 'vent',
  uvIndexAvg: 'UV',
  humidityAvg: 'humidité',
  summerMaxTempAvg: 'max été'
};

export function getHideColumnLabel(columnKey: TableColumnKey) {
  return `Masquer la colonne ${COLUMN_LABELS[columnKey]}`;
}

export function getColumnTooltip(criteria: CriterionDefinition[], columnKey: TableColumnKey) {
  switch (columnKey) {
    case 'favorite':
      return 'Favoris';
    case 'name':
      return 'Ville';
    case 'region':
      return 'Région';
    case 'metroPopulation':
      return 'Population d’agglomération · habitants';
    case 'score':
      return 'Score relatif · /100';
    default: {
      const criterion = criteria.find((candidate) => candidate.key === columnKey);
      return criterion ? `${criterion.label} · ${criterion.unit}` : COLUMN_LABELS[columnKey];
    }
  }
}

export function getHiddenColumnsLinkLabel(hiddenColumnCount: number) {
  return hiddenColumnCount === 1
    ? 'Démasquer la colonne masquée'
    : `Démasquer les ${hiddenColumnCount} colonnes masquées`;
}
