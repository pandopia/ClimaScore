export type MetricKey =
  | 'sunnyDaysAvg'
  | 'rainyDaysAvg'
  | 'cloudyDaysAvg'
  | 'rainfallMmAvg'
  | 'sunHoursAvg'
  | 'hotDays30Avg'
  | 'windyDaysAvg'
  | 'uvIndexAvg'
  | 'humidityAvg'
  | 'summerMaxTempAvg';

export type ScoreDirection = 'minimize' | 'maximize' | 'average';
export type TableColumnKey = 'favorite' | 'name' | 'region' | 'metroPopulation' | 'score' | MetricKey;

export type MonthlyMetricSeries = Record<MetricKey, Array<number | null>>;

export interface CityMetric {
  slug: string;
  name: string;
  region: string;
  metroPopulation: number;
  sunnyDaysAvg: number;
  rainyDaysAvg: number;
  cloudyDaysAvg: number;
  rainfallMmAvg: number;
  sunHoursAvg: number;
  hotDays30Avg: number;
  windyDaysAvg: number;
  uvIndexAvg: number;
  humidityAvg: number;
  summerMaxTempAvg: number;
  monthlyMetrics: MonthlyMetricSeries;
  stationName: string;
  stationDistanceKm: number;
  dataCoverage: number;
}

export interface CriterionDefinition {
  key: MetricKey;
  label: string;
  shortLabel: string;
  unit: string;
  description: string;
  source: string;
  coverage: string;
}

export interface CriterionState {
  enabled: boolean;
  weight: number;
  direction: ScoreDirection;
}

export interface ScorePreset {
  id: string;
  label: string;
  isDefault: boolean;
  criteria: Record<MetricKey, CriterionState>;
}

export interface SourcePeriod {
  startYear: number;
  endYear: number;
}

export interface DashboardData {
  generatedAt: string | null;
  sourcePeriod: SourcePeriod;
  criteria: CriterionDefinition[];
  notes: string[];
  presets: ScorePreset[];
  cities: CityMetric[];
}

export interface DashboardMeta {
  ready: boolean;
  rowCount: number;
  generatedAt: string | null;
  sourcePeriod: SourcePeriod;
  criteria: CriterionDefinition[];
  notes: string[];
  presets: ScorePreset[];
}

export interface UserState {
  favorites: string[];
  hiddenColumns: TableColumnKey[];
  selectedPresetId: string;
  customCriteria: Record<MetricKey, CriterionState>;
  namedPresets: ScorePreset[];
  query: string;
  showOnlyFavorites: boolean;
  sortKey: SortKey;
  sortDirection: 'asc' | 'desc';
  selectedSlug: string | null;
  compareSlug: string | null;
}

export interface Contribution {
  key: MetricKey;
  label: string;
  unit: string;
  rawValue: number;
  score: number;
  weight: number;
  enabled: boolean;
}

export interface ScoredCity extends CityMetric {
  score: number;
  contributions: Record<MetricKey, Contribution>;
}

export type SortKey =
  | 'favorite'
  | 'score'
  | 'name'
  | 'region'
  | 'metroPopulation'
  | MetricKey;

export type ApiMeta = DashboardMeta;
