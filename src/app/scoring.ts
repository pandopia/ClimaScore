import { CityMetric, Contribution, CriterionState, DashboardMeta, MetricKey, ScoredCity, SortKey } from './types';

export function cloneCriteria(source: Record<MetricKey, CriterionState>): Record<MetricKey, CriterionState> {
  return Object.fromEntries(
    Object.entries(source).map(([key, value]) => [key, { ...value }])
  ) as Record<MetricKey, CriterionState>;
}

export function getDefaultPreset(meta: DashboardMeta) {
  return meta.presets.find((preset) => preset.isDefault) ?? meta.presets[0];
}

export function getInitialCriteria(meta: DashboardMeta) {
  return cloneCriteria(getDefaultPreset(meta).criteria);
}

function computeBounds(cities: CityMetric[], metricKey: MetricKey) {
  const values = cities.map((city) => city[metricKey]);
  return {
    min: Math.min(...values),
    max: Math.max(...values)
  };
}

function normalizeValue(value: number, min: number, max: number) {
  if (min === max) {
    return 1;
  }

  return (value - min) / (max - min);
}

export function scoreCities(
  cities: CityMetric[],
  criteria: Record<MetricKey, CriterionState>,
  meta: DashboardMeta,
  referenceCities: CityMetric[] = cities
): ScoredCity[] {
  if (!cities.length) {
    return [];
  }

  const bounds = Object.fromEntries(
    meta.criteria.map((criterion) => [criterion.key, computeBounds(referenceCities, criterion.key)])
  ) as Record<MetricKey, { min: number; max: number }>;

  return cities.map((city) => {
    let weightedTotal = 0;
    let totalWeight = 0;

    const contributions = Object.fromEntries(
      meta.criteria.map((criterion) => {
        const criterionState = criteria[criterion.key];
        const { min, max } = bounds[criterion.key];
        const rawValue = city[criterion.key];
        const baseScore = normalizeValue(rawValue, min, max);
        const normalizedScore = criterionState.direction === 'maximize' ? baseScore : 1 - baseScore;

        if (criterionState.enabled && criterionState.weight > 0) {
          weightedTotal += normalizedScore * criterionState.weight;
          totalWeight += criterionState.weight;
        }

        const contribution: Contribution = {
          key: criterion.key,
          label: criterion.label,
          unit: criterion.unit,
          rawValue,
          score: normalizedScore,
          weight: criterionState.weight,
          enabled: criterionState.enabled
        };

        return [criterion.key, contribution];
      })
    ) as Record<MetricKey, Contribution>;

    return {
      ...city,
      score: totalWeight ? Number.parseFloat(((weightedTotal / totalWeight) * 100).toFixed(1)) : 0,
      contributions
    };
  });
}

export function sortCities(
  cities: ScoredCity[],
  sortKey: SortKey,
  sortDirection: 'asc' | 'desc',
  favorites: ReadonlySet<string> = new Set()
) {
  const factor = sortDirection === 'asc' ? 1 : -1;

  return [...cities].sort((left, right) => {
    if (sortKey === 'favorite') {
      const leftValue = favorites.has(left.slug) ? 1 : 0;
      const rightValue = favorites.has(right.slug) ? 1 : 0;
      const favoriteDelta = (leftValue - rightValue) * factor;

      if (favoriteDelta !== 0) {
        return favoriteDelta;
      }

      if (left.score !== right.score) {
        return right.score - left.score;
      }

      return left.name.localeCompare(right.name, 'fr');
    }

    const leftValue = sortKey === 'score' ? left.score : left[sortKey];
    const rightValue = sortKey === 'score' ? right.score : right[sortKey];

    if (typeof leftValue === 'string' && typeof rightValue === 'string') {
      const delta = leftValue.localeCompare(rightValue, 'fr') * factor;
      return delta || left.name.localeCompare(right.name, 'fr');
    }

    const delta = ((leftValue as number) - (rightValue as number)) * factor;
    return delta || left.name.localeCompare(right.name, 'fr');
  });
}
