import { cloneCriteria } from './scoring';
import {
  CriterionState,
  DashboardData,
  DashboardMeta,
  MetricKey,
  ScorePreset,
  SortKey,
  TableColumnKey,
  UserState
} from './types';

export const USER_STATE_STORAGE_KEY = 'meteoweight:user-state:v1';
export const LEGACY_FAVORITES_STORAGE_KEY = 'meteoweight:favorites';

const VALID_SORT_KEYS = new Set<SortKey>([
  'favorite',
  'score',
  'name',
  'region',
  'metroPopulation',
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
]);

const VALID_TABLE_COLUMN_KEYS = new Set<TableColumnKey>([
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
]);

function getDefaultBuiltInPreset(dashboard: DashboardData) {
  return dashboard.presets.find((preset) => preset.isDefault) ?? dashboard.presets[0];
}

function getDefaultCustomCriteria(dashboard: DashboardData) {
  return cloneCriteria(getDefaultBuiltInPreset(dashboard).criteria);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function slugifyLabel(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function normalizeCriterionState(rawValue: unknown, fallback: CriterionState): CriterionState {
  if (!isRecord(rawValue)) {
    return { ...fallback };
  }

  const rawWeight = rawValue['weight'];
  const weight =
    typeof rawWeight === 'number' && Number.isFinite(rawWeight)
      ? Math.max(0, Math.min(10, Math.round(rawWeight)))
      : fallback.weight;

  return {
    enabled: typeof rawValue['enabled'] === 'boolean' ? rawValue['enabled'] : fallback.enabled,
    weight,
    direction:
      rawValue['direction'] === 'maximize' || rawValue['direction'] === 'minimize'
        ? rawValue['direction']
        : fallback.direction
  };
}

function normalizeCriteria(
  dashboard: DashboardData,
  rawCriteria: unknown
): Record<MetricKey, CriterionState> {
  const fallback = getDefaultCustomCriteria(dashboard);

  return Object.fromEntries(
    Object.entries(fallback).map(([metricKey, criterionState]) => [
      metricKey,
      normalizeCriterionState(isRecord(rawCriteria) ? rawCriteria[metricKey] : null, criterionState)
    ])
  ) as Record<MetricKey, CriterionState>;
}

export function clonePreset(preset: ScorePreset): ScorePreset {
  return {
    ...preset,
    criteria: cloneCriteria(preset.criteria)
  };
}

function normalizeNamedPreset(
  dashboard: DashboardData,
  rawPreset: unknown,
  usedIds: Set<string>
): ScorePreset | null {
  if (!isRecord(rawPreset) || typeof rawPreset['label'] !== 'string' || !rawPreset['label'].trim()) {
    return null;
  }

  const requestedId = typeof rawPreset['id'] === 'string' ? rawPreset['id'] : '';
  const label = rawPreset['label'].trim();
  const criteria = normalizeCriteria(dashboard, rawPreset['criteria']);
  const id = createNamedPresetId(label, [], usedIds, usedIds.has(requestedId) ? undefined : requestedId);

  usedIds.add(id);

  return {
    id,
    label,
    isDefault: false,
    criteria
  };
}

function normalizeNamedPresets(dashboard: DashboardData, rawPresets: unknown) {
  const usedIds = new Set(dashboard.presets.map((preset) => preset.id).concat(['custom']));

  if (!Array.isArray(rawPresets)) {
    return [] as ScorePreset[];
  }

  return rawPresets
    .map((preset) => normalizeNamedPreset(dashboard, preset, usedIds))
    .filter((preset): preset is ScorePreset => Boolean(preset))
    .sort((left, right) => left.label.localeCompare(right.label, 'fr'))
    .map(clonePreset);
}

function readStorageItem(key: string) {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function readJsonStorage(key: string) {
  const rawValue = readStorageItem(key);
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue);
  } catch {
    return null;
  }
}

function loadLegacyFavorites() {
  const parsed = readJsonStorage(LEGACY_FAVORITES_STORAGE_KEY);
  return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [];
}

function normalizeStringArray(rawValue: unknown, allowedValues?: ReadonlySet<string>) {
  if (!Array.isArray(rawValue)) {
    return [] as string[];
  }

  return rawValue.filter(
    (value): value is string => typeof value === 'string' && (!allowedValues || allowedValues.has(value))
  );
}

export function getDefaultUserState(dashboard: DashboardData): UserState {
  return {
    favorites: [],
    hiddenColumns: [],
    selectedPresetId: getDefaultBuiltInPreset(dashboard).id,
    customCriteria: getDefaultCustomCriteria(dashboard),
    namedPresets: [],
    query: '',
    showOnlyFavorites: false,
    sortKey: 'score',
    sortDirection: 'desc',
    selectedSlug: dashboard.cities[0]?.slug ?? null,
    compareSlug: null
  };
}

export function buildDashboardMeta(
  dashboard: DashboardData,
  customCriteria: Record<MetricKey, CriterionState>,
  namedPresets: ScorePreset[]
): DashboardMeta {
  const builtInPresets = dashboard.presets
    .filter((preset) => preset.id !== 'custom' && !preset.id.startsWith('saved-'))
    .map(clonePreset);
  const customPreset: ScorePreset = {
    id: 'custom',
    label: 'Personnalisé',
    isDefault: false,
    criteria: cloneCriteria(customCriteria)
  };

  return {
    ready: dashboard.cities.length > 0,
    rowCount: dashboard.cities.length,
    generatedAt: dashboard.generatedAt,
    sourcePeriod: dashboard.sourcePeriod,
    criteria: dashboard.criteria,
    notes: dashboard.notes,
    presets: [...builtInPresets, customPreset, ...namedPresets.map(clonePreset)]
  };
}

export function loadUserState(dashboard: DashboardData): UserState {
  const defaults = getDefaultUserState(dashboard);
  const storedState = readJsonStorage(USER_STATE_STORAGE_KEY);
  const rawState = isRecord(storedState) ? storedState : null;
  const validSlugs = new Set(dashboard.cities.map((city) => city.slug));
  const favorites = rawState
    ? normalizeStringArray(rawState['favorites'], validSlugs)
    : loadLegacyFavorites().filter((slug) => validSlugs.has(slug));
  const hiddenColumns = normalizeStringArray(rawState?.['hiddenColumns'], VALID_TABLE_COLUMN_KEYS).map(
    (columnKey) => columnKey as TableColumnKey
  );
  const customCriteria = normalizeCriteria(dashboard, rawState?.['customCriteria']);
  const namedPresets = normalizeNamedPresets(dashboard, rawState?.['namedPresets']);
  const meta = buildDashboardMeta(dashboard, customCriteria, namedPresets);
  const selectedPresetId =
    typeof rawState?.['selectedPresetId'] === 'string' &&
    meta.presets.some((preset) => preset.id === rawState['selectedPresetId'])
      ? rawState['selectedPresetId']
      : defaults.selectedPresetId;
  const selectedSlug =
    typeof rawState?.['selectedSlug'] === 'string' && validSlugs.has(rawState['selectedSlug'])
      ? rawState['selectedSlug']
      : defaults.selectedSlug;
  const compareSlug =
    typeof rawState?.['compareSlug'] === 'string' &&
    rawState['compareSlug'] !== selectedSlug &&
    validSlugs.has(rawState['compareSlug'])
      ? rawState['compareSlug']
      : defaults.compareSlug;

  return {
    favorites,
    hiddenColumns,
    selectedPresetId,
    customCriteria,
    namedPresets,
    query: typeof rawState?.['query'] === 'string' ? rawState['query'] : defaults.query,
    showOnlyFavorites:
      typeof rawState?.['showOnlyFavorites'] === 'boolean'
        ? rawState['showOnlyFavorites']
        : defaults.showOnlyFavorites,
    sortKey:
      typeof rawState?.['sortKey'] === 'string' && VALID_SORT_KEYS.has(rawState['sortKey'] as SortKey)
        ? (rawState['sortKey'] as SortKey)
        : defaults.sortKey,
    sortDirection:
      rawState?.['sortDirection'] === 'asc' || rawState?.['sortDirection'] === 'desc'
        ? rawState['sortDirection']
        : defaults.sortDirection,
    selectedSlug,
    compareSlug
  };
}

export function saveUserState(state: UserState) {
  try {
    globalThis.localStorage?.setItem(USER_STATE_STORAGE_KEY, JSON.stringify(state));
    globalThis.localStorage?.removeItem(LEGACY_FAVORITES_STORAGE_KEY);
  } catch {
    // Ignore local persistence failures and keep the in-memory state.
  }
}

export function createNamedPresetId(
  label: string,
  presets: Pick<ScorePreset, 'id'>[],
  additionalReservedIds: Set<string> = new Set(),
  preferredId?: string
) {
  const slug = slugifyLabel(label) || 'preset';
  const baseId = `saved-${slug}`;
  const reservedIds = new Set([...presets.map((preset) => preset.id), ...additionalReservedIds]);

  if (preferredId && preferredId.startsWith('saved-') && (preferredId === baseId || !reservedIds.has(preferredId))) {
    return preferredId;
  }

  if (!reservedIds.has(baseId)) {
    return baseId;
  }

  let suffix = 2;
  while (reservedIds.has(`${baseId}-${suffix}`)) {
    suffix += 1;
  }

  return `${baseId}-${suffix}`;
}
