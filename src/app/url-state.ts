import { cloneCriteria } from './scoring';
import { CriterionState, DashboardMeta, MetricKey, UserState } from './types';

function encodeBase64Url(value: string) {
  if (!globalThis.btoa) {
    throw new Error('Base64 encoding is unavailable in this environment.');
  }

  const encoded = globalThis.btoa(value);
  return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeBase64Url(value: string) {
  if (!globalThis.atob) {
    throw new Error('Base64 decoding is unavailable in this environment.');
  }

  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return globalThis.atob(padded);
}

function serializeCriteria(criteria: Record<MetricKey, CriterionState>) {
  const compact = Object.fromEntries(
    Object.entries(criteria).map(([key, value]) => [
      key,
      [
        value.enabled ? 1 : 0,
        value.weight,
        value.direction === 'maximize' ? 'max' : value.direction === 'average' ? 'avg' : 'min'
      ]
    ])
  );

  return encodeBase64Url(JSON.stringify(compact));
}

function deserializeCriteria(
  encodedCriteria: string,
  fallbackCriteria: Record<MetricKey, CriterionState>
): Record<MetricKey, CriterionState> | null {
  try {
    const parsed = JSON.parse(decodeBase64Url(encodedCriteria)) as Record<string, [number, number, string]>;

    return Object.fromEntries(
      Object.entries(fallbackCriteria).map(([key, fallback]) => {
        const rawValue = parsed[key];
        if (!Array.isArray(rawValue) || rawValue.length !== 3) {
          return [key, { ...fallback }];
        }

        const rawWeight = Number(rawValue[1]);
        return [
          key,
          {
            enabled: rawValue[0] === 1,
            weight: Number.isFinite(rawWeight) ? Math.max(0, Math.min(10, Math.round(rawWeight))) : fallback.weight,
            direction: rawValue[2] === 'max' ? 'maximize' : rawValue[2] === 'avg' ? 'average' : 'minimize'
          }
        ];
      })
    ) as Record<MetricKey, CriterionState>;
  } catch {
    return null;
  }
}

function getCurrentSearchParams() {
  if (!globalThis.location) {
    return new URLSearchParams();
  }

  return new URLSearchParams(globalThis.location.search);
}

export function applyUrlState(
  userState: UserState,
  meta: DashboardMeta,
  validSlugs: Set<string>
): Pick<UserState, 'selectedSlug' | 'compareSlug' | 'selectedPresetId' | 'customCriteria'> {
  const params = getCurrentSearchParams();
  const selectedSlug =
    typeof params.get('city') === 'string' && validSlugs.has(params.get('city') as string)
      ? (params.get('city') as string)
      : userState.selectedSlug;
  const compareSlug =
    typeof params.get('compare') === 'string' &&
    params.get('compare') !== selectedSlug &&
    validSlugs.has(params.get('compare') as string)
      ? (params.get('compare') as string)
      : userState.compareSlug;
  const encodedCriteria = params.get('criteria');
  const urlCriteria = encodedCriteria ? deserializeCriteria(encodedCriteria, userState.customCriteria) : null;
  const presetId = params.get('preset');
  const selectedPresetId =
    urlCriteria
      ? 'custom'
      : presetId && meta.presets.some((preset) => preset.id === presetId)
        ? presetId
        : userState.selectedPresetId;

  return {
    selectedSlug,
    compareSlug,
    selectedPresetId,
    customCriteria: urlCriteria ?? cloneCriteria(userState.customCriteria)
  };
}

export function syncUrlState(
  meta: DashboardMeta,
  selectedSlug: string | null,
  compareSlug: string | null,
  selectedPresetId: string,
  criteria: Record<MetricKey, CriterionState>
) {
  if (!globalThis.history || !globalThis.location) {
    return;
  }

  const url = new URL(globalThis.location.href);

  if (selectedSlug) {
    url.searchParams.set('city', selectedSlug);
  } else {
    url.searchParams.delete('city');
  }

  if (compareSlug) {
    url.searchParams.set('compare', compareSlug);
  } else {
    url.searchParams.delete('compare');
  }

  const selectedPreset = meta.presets.find((preset) => preset.id === selectedPresetId);
  const isBuiltInPreset = Boolean(selectedPreset && !selectedPreset.id.startsWith('saved-') && selectedPreset.id !== 'custom');

  if (isBuiltInPreset) {
    url.searchParams.set('preset', selectedPresetId);
    url.searchParams.delete('criteria');
  } else {
    url.searchParams.set('preset', 'custom');
    url.searchParams.set('criteria', serializeCriteria(criteria));
  }

  if (url.toString() !== globalThis.location.href) {
    globalThis.history.replaceState({}, '', url);
  }
}
