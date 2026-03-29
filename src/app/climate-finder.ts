import { CriterionDefinition, CriterionState, MetricKey } from './types';

export type SkyPreference = 'sunny' | 'balanced' | 'cloudy' | 'covered';
export type RainPreference = 'avoid' | 'sometimes' | 'neutral' | 'love';
export type SummerPreference = 'very-hot' | 'warm' | 'temperate' | 'cool';
export type ComfortPreference = 'calm' | 'comfortable' | 'wind-ok' | 'windy';
export type PriorityPreference = 'sun' | 'temperature' | 'rain' | 'balance';

export interface ClimateFinderAnswers {
  sky: SkyPreference;
  rain: RainPreference;
  summer: SummerPreference;
  comfort: ComfortPreference;
  priority: PriorityPreference;
}

export const DEFAULT_CLIMATE_FINDER_ANSWERS: ClimateFinderAnswers = {
  sky: 'balanced',
  rain: 'sometimes',
  summer: 'warm',
  comfort: 'comfortable',
  priority: 'balance'
};

function createBlankCriteria(criteriaDefinitions: CriterionDefinition[]) {
  return Object.fromEntries(
    criteriaDefinitions.map((criterion) => [
      criterion.key,
      {
        enabled: false,
        weight: 0,
        direction: 'minimize'
      }
    ])
  ) as Record<MetricKey, CriterionState>;
}

function mergeCriterion(
  criteria: Record<MetricKey, CriterionState>,
  key: MetricKey,
  direction: CriterionState['direction'],
  weight: number
) {
  const current = criteria[key];
  criteria[key] = {
    enabled: true,
    direction,
    weight: Math.min(10, (current?.enabled ? current.weight : 0) + weight)
  };
}

function boostCriteria(criteria: Record<MetricKey, CriterionState>, keys: MetricKey[], factor: number) {
  keys.forEach((key) => {
    const current = criteria[key];
    if (!current?.enabled || current.weight <= 0) {
      return;
    }

    criteria[key] = {
      ...current,
      weight: Math.min(10, Math.max(1, Math.round(current.weight * factor)))
    };
  });
}

export function buildClimateFinderCriteria(
  criteriaDefinitions: CriterionDefinition[],
  answers: ClimateFinderAnswers
) {
  const criteria = createBlankCriteria(criteriaDefinitions);

  switch (answers.sky) {
    case 'sunny':
      mergeCriterion(criteria, 'sunnyDaysAvg', 'maximize', 8);
      mergeCriterion(criteria, 'sunHoursAvg', 'maximize', 8);
      mergeCriterion(criteria, 'cloudyDaysAvg', 'minimize', 7);
      mergeCriterion(criteria, 'uvIndexAvg', 'maximize', 4);
      break;
    case 'balanced':
      mergeCriterion(criteria, 'sunnyDaysAvg', 'maximize', 5);
      mergeCriterion(criteria, 'sunHoursAvg', 'maximize', 5);
      mergeCriterion(criteria, 'cloudyDaysAvg', 'minimize', 4);
      break;
    case 'cloudy':
      mergeCriterion(criteria, 'cloudyDaysAvg', 'maximize', 8);
      mergeCriterion(criteria, 'sunnyDaysAvg', 'minimize', 5);
      mergeCriterion(criteria, 'sunHoursAvg', 'minimize', 5);
      break;
    case 'covered':
      mergeCriterion(criteria, 'cloudyDaysAvg', 'maximize', 10);
      mergeCriterion(criteria, 'sunnyDaysAvg', 'minimize', 8);
      mergeCriterion(criteria, 'sunHoursAvg', 'minimize', 8);
      break;
  }

  switch (answers.rain) {
    case 'avoid':
      mergeCriterion(criteria, 'rainyDaysAvg', 'minimize', 8);
      mergeCriterion(criteria, 'rainfallMmAvg', 'minimize', 8);
      break;
    case 'sometimes':
      mergeCriterion(criteria, 'rainyDaysAvg', 'minimize', 5);
      mergeCriterion(criteria, 'rainfallMmAvg', 'minimize', 5);
      break;
    case 'neutral':
      mergeCriterion(criteria, 'rainyDaysAvg', 'minimize', 2);
      mergeCriterion(criteria, 'rainfallMmAvg', 'minimize', 2);
      break;
    case 'love':
      mergeCriterion(criteria, 'rainyDaysAvg', 'maximize', 8);
      mergeCriterion(criteria, 'rainfallMmAvg', 'maximize', 8);
      break;
  }

  switch (answers.summer) {
    case 'very-hot':
      mergeCriterion(criteria, 'hotDays30Avg', 'maximize', 8);
      mergeCriterion(criteria, 'summerMaxTempAvg', 'maximize', 9);
      break;
    case 'warm':
      mergeCriterion(criteria, 'hotDays30Avg', 'maximize', 5);
      mergeCriterion(criteria, 'summerMaxTempAvg', 'maximize', 6);
      break;
    case 'temperate':
      mergeCriterion(criteria, 'hotDays30Avg', 'minimize', 4);
      mergeCriterion(criteria, 'summerMaxTempAvg', 'minimize', 4);
      break;
    case 'cool':
      mergeCriterion(criteria, 'hotDays30Avg', 'minimize', 8);
      mergeCriterion(criteria, 'summerMaxTempAvg', 'minimize', 8);
      break;
  }

  switch (answers.comfort) {
    case 'calm':
      mergeCriterion(criteria, 'windyDaysAvg', 'minimize', 8);
      break;
    case 'comfortable':
      mergeCriterion(criteria, 'windyDaysAvg', 'minimize', 5);
      break;
    case 'wind-ok':
      mergeCriterion(criteria, 'windyDaysAvg', 'minimize', 2);
      break;
    case 'windy':
      mergeCriterion(criteria, 'windyDaysAvg', 'maximize', 8);
      break;
  }

  switch (answers.priority) {
    case 'sun':
      boostCriteria(criteria, ['sunnyDaysAvg', 'sunHoursAvg', 'cloudyDaysAvg', 'uvIndexAvg'], 2);
      break;
    case 'temperature':
      boostCriteria(criteria, ['hotDays30Avg', 'summerMaxTempAvg'], 2.2);
      break;
    case 'rain':
      boostCriteria(criteria, ['rainyDaysAvg', 'rainfallMmAvg'], 2.2);
      break;
    case 'balance':
      mergeCriterion(criteria, 'humidityAvg', 'minimize', 3);
      break;
  }

  return criteria;
}
