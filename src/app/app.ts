import { Component, ViewEncapsulation, computed, effect, inject, signal } from '@angular/core';
import { WeatherDataService } from './api.service';
import { buildClimateFinderCriteria, ClimateFinderAnswers, DEFAULT_CLIMATE_FINDER_ANSWERS } from './climate-finder';
import { ControlsPanelComponent } from './components/controls-panel.component';
import { RankingTableComponent } from './components/ranking-table.component';
import { CityDetailComponent } from './components/city-detail.component';
import { ScoreCustomizationModalComponent } from './components/score-customization-modal.component';
import { CriteriaInfoModalComponent } from './components/criteria-info-modal.component';
import { ClimateFinderModalComponent } from './components/climate-finder-modal.component';
import { createMonthlyChart, MonthlyChart } from './monthly-chart';
import { cloneCriteria, getDefaultPreset, scoreCities, sortCities } from './scoring';
import { formatNumber } from './formatters';
import { TABLE_COLUMNS } from './table-columns';
import { applyUrlState, syncUrlState } from './url-state';
import { buildDashboardMeta, clonePreset, createNamedPresetId, loadUserState, saveUserState } from './user-state';
import {
  CityMetric,
  CriterionState,
  DashboardData,
  DashboardMeta,
  MetricKey,
  ScoredCity,
  ScoreDirection,
  ScorePreset,
  SortKey,
  TableColumnKey,
  UserState
} from './types';

function normalizeSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();
}

function matchesSearchQuery(haystack: string, rawQuery: string) {
  const normalizedHaystack = normalizeSearchText(haystack);
  const queryTokens = normalizeSearchText(rawQuery)
    .split(/\s+/)
    .filter(Boolean);

  return queryTokens.every((token) => normalizedHaystack.includes(token));
}

@Component({
  selector: 'app-root',
  imports: [
    ControlsPanelComponent,
    RankingTableComponent,
    CityDetailComponent,
    ScoreCustomizationModalComponent,
    CriteriaInfoModalComponent,
    ClimateFinderModalComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  encapsulation: ViewEncapsulation.None
})
export class App {
  private readonly api = inject(WeatherDataService);
  private readonly persistenceReady = signal(false);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly dashboard = signal<DashboardData | null>(null);
  readonly cities = computed(() => this.dashboard()?.cities ?? []);
  readonly meta = computed<DashboardMeta | null>(() => {
    const dashboard = this.dashboard();
    if (!dashboard) {
      return null;
    }

    return buildDashboardMeta(dashboard, this.customCriteria(), this.namedPresets());
  });
  readonly criteria = signal<Record<MetricKey, CriterionState>>({} as Record<MetricKey, CriterionState>);
  readonly customCriteria = signal<Record<MetricKey, CriterionState>>({} as Record<MetricKey, CriterionState>);
  readonly namedPresets = signal<ScorePreset[]>([]);
  readonly selectedPresetId = signal('sun-lover');
  readonly query = signal('');
  readonly showOnlyFavorites = signal(false);
  readonly sortKey = signal<SortKey>('score');
  readonly sortDirection = signal<'asc' | 'desc'>('desc');
  readonly selectedSlug = signal<string | null>(null);
  readonly compareSlug = signal<string | null>(null);
  readonly favorites = signal<Set<string>>(new Set());
  readonly presetFeedback = signal<string | null>(null);
  readonly presetFeedbackKind = signal<'success' | 'error' | null>(null);
  readonly hiddenColumns = signal<Set<TableColumnKey>>(new Set());
  readonly scoreCustomizationOpen = signal(false);
  readonly climateFinderOpen = signal(false);
  readonly criteriaInfoOpen = signal(false);
  readonly presetNameDraft = signal('');
  readonly climateFinderAnswers = signal<ClimateFinderAnswers>(DEFAULT_CLIMATE_FINDER_ANSWERS);
  readonly draftCriteria = signal<Record<MetricKey, CriterionState>>({} as Record<MetricKey, CriterionState>);

  readonly filteredScoredCities = computed(() => {
    const meta = this.meta();
    if (!meta) {
      return [];
    }

    const scoredCities = scoreCities(this.cities(), this.criteria(), meta, this.cities());
    const visibleCities = scoredCities.filter((city) => {
      const searchHaystack = `${city.name} ${city.region}`;
      const matchesQuery = matchesSearchQuery(searchHaystack, this.query());
      const matchesFavorites = !this.showOnlyFavorites() || this.favorites().has(city.slug);
      return matchesQuery && matchesFavorites;
    });

    return sortCities(visibleCities, this.sortKey(), this.sortDirection(), this.favorites());
  });

  readonly selectedCity = computed<ScoredCity | null>(() => {
    const visibleCities = this.filteredScoredCities();
    return visibleCities.find((city) => city.slug === this.selectedSlug()) ?? visibleCities[0] ?? null;
  });

  readonly compareOptions = computed(() => {
    const selectedSlug = this.selectedCity()?.slug;
    const baseCities = this.filteredScoredCities();

    return [...baseCities]
      .filter((city) => city.slug !== selectedSlug)
      .sort((left, right) => left.name.localeCompare(right.name, 'fr'));
  });

  readonly compareCity = computed<CityMetric | null>(() => {
    const compareOptions = this.compareOptions();
    const compareSlug = this.compareSlug();
    if (!compareSlug) {
      return compareOptions[0] ?? null;
    }

    return compareOptions.find((city) => city.slug === compareSlug) ?? compareOptions[0] ?? null;
  });

  readonly activeCriteriaCount = computed(() =>
    Object.values(this.criteria()).filter((criterion) => criterion.enabled && criterion.weight > 0).length
  );

  readonly favoriteCount = computed(() => this.favorites().size);

  constructor() {
    void this.load();

    effect(() => {
      const selectedSlug = this.selectedCity()?.slug;
      const compareOptions = this.compareOptions();
      const compareSlug = this.compareSlug();

      if (!compareOptions.length) {
        if (compareSlug !== null) {
          this.compareSlug.set(null);
        }
        return;
      }

      const compareStillValid =
        compareSlug && compareSlug !== selectedSlug
          ? compareOptions.some((city) => city.slug === compareSlug)
          : false;

      if (!compareStillValid) {
        this.compareSlug.set(compareOptions[0].slug);
      }
    });

    effect(() => {
      if (!this.persistenceReady() || !this.dashboard()) {
        return;
      }

      const userState: UserState = {
        favorites: Array.from(this.favorites()).sort((left, right) => left.localeCompare(right)),
        hiddenColumns: TABLE_COLUMNS.filter((columnKey) => this.hiddenColumns().has(columnKey)),
        selectedPresetId: this.selectedPresetId(),
        customCriteria: cloneCriteria(this.customCriteria()),
        namedPresets: this.namedPresets().map(clonePreset),
        query: this.query(),
        showOnlyFavorites: this.showOnlyFavorites(),
        sortKey: this.sortKey(),
        sortDirection: this.sortDirection(),
        selectedSlug: this.selectedSlug(),
        compareSlug: this.compareSlug()
      };

      saveUserState(userState);
    });

    effect(() => {
      const meta = this.meta();
      if (!this.persistenceReady() || !meta) {
        return;
      }

      syncUrlState(meta, this.selectedSlug(), this.compareSlug(), this.selectedPresetId(), this.criteria());
    });
  }

  async load() {
    this.loading.set(true);
    this.error.set(null);
    this.persistenceReady.set(false);

    try {
      const dashboard = await this.api.loadDashboard();
      const userState = loadUserState(dashboard);
      const validSlugs = new Set(dashboard.cities.map((city) => city.slug));
      const urlAwareState = applyUrlState(
        userState,
        buildDashboardMeta(dashboard, userState.customCriteria, userState.namedPresets),
        validSlugs
      );
      const customCriteria = cloneCriteria(urlAwareState.customCriteria);
      const meta = buildDashboardMeta(dashboard, customCriteria, userState.namedPresets);
      const selectedPreset =
        meta.presets.find((preset) => preset.id === urlAwareState.selectedPresetId) ?? getDefaultPreset(meta);

      this.namedPresets.set(userState.namedPresets.map(clonePreset));
      this.customCriteria.set(customCriteria);
      this.criteria.set(cloneCriteria(selectedPreset.criteria));
      this.draftCriteria.set(cloneCriteria(selectedPreset.criteria));
      this.selectedPresetId.set(selectedPreset.id);
      this.query.set(userState.query);
      this.showOnlyFavorites.set(userState.showOnlyFavorites);
      this.sortKey.set(userState.sortKey);
      this.sortDirection.set(userState.sortDirection);
      this.selectedSlug.set(urlAwareState.selectedSlug);
      this.compareSlug.set(urlAwareState.compareSlug);
      this.favorites.set(new Set(userState.favorites));
      this.hiddenColumns.set(new Set(userState.hiddenColumns));
      this.presetFeedback.set(null);
      this.presetFeedbackKind.set(null);
      this.dashboard.set(dashboard);
      this.persistenceReady.set(true);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Impossible de charger les données statiques.');
    } finally {
      this.loading.set(false);
    }
  }

  applyPreset(presetId: string) {
    const preset = this.meta()?.presets.find((candidate) => candidate.id === presetId);
    if (!preset) {
      return;
    }

    this.selectedPresetId.set(presetId);
    this.criteria.set(cloneCriteria(preset.criteria));
    this.presetFeedback.set(null);
    this.presetFeedbackKind.set(null);
  }

  openScoreCustomization() {
    const currentPreset = this.meta()?.presets.find((preset) => preset.id === this.selectedPresetId());
    if (currentPreset && this.canDeletePreset(currentPreset)) {
      this.presetNameDraft.set(currentPreset.label);
    } else if (this.selectedPresetId() !== 'custom') {
      this.presetNameDraft.set('');
    }

    this.draftCriteria.set(cloneCriteria(this.criteria()));
    this.scoreCustomizationOpen.set(true);
  }

  closeScoreCustomization() {
    this.draftCriteria.set(cloneCriteria(this.criteria()));
    this.scoreCustomizationOpen.set(false);
  }

  openClimateFinder() {
    this.climateFinderOpen.set(true);
  }

  closeClimateFinder() {
    this.climateFinderOpen.set(false);
  }

  openCriteriaInfo() {
    this.criteriaInfoOpen.set(true);
  }

  closeCriteriaInfo() {
    this.criteriaInfoOpen.set(false);
  }

  updateWeight(metricKey: MetricKey, rawWeight: string) {
    const weight = Number.parseInt(rawWeight, 10);
    const criteria = this.scoreCustomizationOpen() ? this.draftCriteria() : this.criteria();
    const nextCriteria = {
      ...criteria,
      [metricKey]: {
        ...criteria[metricKey],
        weight: Number.isFinite(weight) ? weight : criteria[metricKey].weight
      }
    };

    if (this.scoreCustomizationOpen()) {
      this.draftCriteria.set(nextCriteria);
      return;
    }

    this.setCustomCriteria(nextCriteria);
  }

  applyScoreCustomization() {
    this.setCustomCriteria(this.draftCriteria());
    this.presetFeedback.set(null);
    this.presetFeedbackKind.set(null);
    this.scoreCustomizationOpen.set(false);
  }

  saveCurrentPreset() {
    const meta = this.meta();
    if (!meta) {
      return;
    }

    const currentPreset = meta.presets.find((preset) => preset.id === this.selectedPresetId());
    const editablePreset =
      currentPreset && !currentPreset.isDefault && currentPreset.id.startsWith('saved-') ? currentPreset : null;
    const label = this.presetNameDraft().trim();

    if (!label) {
      this.presetFeedback.set('Donne un nom à ce calcul avant de le sauvegarder.');
      this.presetFeedbackKind.set('error');
      return;
    }

    this.presetFeedback.set(null);
    this.presetFeedbackKind.set(null);

    const presetId = createNamedPresetId(label, meta.presets, new Set(), editablePreset?.id);
    const criteriaToSave = cloneCriteria(this.scoreCustomizationOpen() ? this.draftCriteria() : this.criteria());
    const preset: ScorePreset = {
      id: presetId,
      label,
      isDefault: false,
      criteria: criteriaToSave
    };

    this.namedPresets.update((currentPresets) => {
      const nextPresets = currentPresets.filter(
        (candidate) => candidate.id !== editablePreset?.id && candidate.id !== preset.id
      );
      nextPresets.push(clonePreset(preset));
      return nextPresets.sort((left, right) => left.label.localeCompare(right.label, 'fr'));
    });

    this.customCriteria.set(cloneCriteria(criteriaToSave));
    this.criteria.set(cloneCriteria(criteriaToSave));
    this.draftCriteria.set(cloneCriteria(criteriaToSave));
    this.selectedPresetId.set(preset.id);
    this.presetFeedback.set(`Calcul "${preset.label}" sauvegardé localement.`);
    this.presetFeedbackKind.set('success');
    this.scoreCustomizationOpen.set(false);
  }

  canDeletePreset(preset: ScorePreset | null | undefined) {
    return Boolean(preset && !preset.isDefault && preset.id.startsWith('saved-'));
  }

  deletePreset(presetId: string, event?: Event) {
    event?.stopPropagation();

    const meta = this.meta();
    const preset = meta?.presets.find((candidate) => candidate.id === presetId);
    if (!preset || !this.canDeletePreset(preset)) {
      return;
    }

    if (!globalThis.confirm(`Supprimer le calcul "${preset.label}" ?`)) {
      return;
    }

    const fallbackPreset = meta ? getDefaultPreset(meta) : null;

    this.namedPresets.update((currentPresets) => currentPresets.filter((candidate) => candidate.id !== presetId));

    if (this.selectedPresetId() === presetId && fallbackPreset) {
      this.selectedPresetId.set(fallbackPreset.id);
      this.criteria.set(cloneCriteria(fallbackPreset.criteria));
    }

    if (this.presetNameDraft() === preset.label) {
      this.presetNameDraft.set('');
    }

    this.presetFeedback.set(null);
    this.presetFeedbackKind.set(null);
  }

  toggleEnabled(metricKey: MetricKey, enabled: boolean) {
    const criteria = this.scoreCustomizationOpen() ? this.draftCriteria() : this.criteria();
    const nextCriteria = {
      ...criteria,
      [metricKey]: {
        ...criteria[metricKey],
        enabled
      }
    };

    if (this.scoreCustomizationOpen()) {
      this.draftCriteria.set(nextCriteria);
      return;
    }

    this.setCustomCriteria(nextCriteria);
  }

  updateDirection(metricKey: MetricKey, direction: ScoreDirection) {
    const criteria = this.scoreCustomizationOpen() ? this.draftCriteria() : this.criteria();
    const nextCriteria = {
      ...criteria,
      [metricKey]: {
        ...criteria[metricKey],
        direction
      }
    };

    if (this.scoreCustomizationOpen()) {
      this.draftCriteria.set(nextCriteria);
      return;
    }

    this.setCustomCriteria(nextCriteria);
  }

  selectCity(slug: string) {
    this.selectedSlug.set(slug);
  }

  selectCompareCity(slug: string) {
    this.compareSlug.set(slug || null);
  }

  setShowOnlyFavorites(enabled: boolean) {
    this.showOnlyFavorites.set(enabled);

    if (enabled) {
      this.query.set('');
    }
  }

  setClimateFinderAnswer(key: keyof ClimateFinderAnswers, value: ClimateFinderAnswers[keyof ClimateFinderAnswers]) {
    this.climateFinderAnswers.update((answers) => ({
      ...answers,
      [key]: value
    }));
  }

  applyClimateFinder() {
    const criteriaDefinitions = this.meta()?.criteria ?? [];
    const criteria = buildClimateFinderCriteria(criteriaDefinitions, this.climateFinderAnswers());
    this.setCustomCriteria(criteria);
    this.climateFinderOpen.set(false);
    this.presetNameDraft.set('Mon climat idéal');
    this.presetFeedback.set('Calcul personnalisé appliqué à partir de tes réponses.');
    this.presetFeedbackKind.set('success');
  }

  setSort(sortKey: SortKey) {
    if (this.sortKey() === sortKey) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
      return;
    }

    this.sortKey.set(sortKey);
    this.sortDirection.set(sortKey === 'name' || sortKey === 'region' ? 'asc' : 'desc');
  }

  isColumnHidden(columnKey: TableColumnKey) {
    return this.hiddenColumns().has(columnKey);
  }

  isFavorite(slug: string) {
    return this.favorites().has(slug);
  }

  toggleFavorite(slug: string, event?: Event) {
    event?.stopPropagation();

    this.favorites.update((favorites) => {
      const nextFavorites = new Set(favorites);
      if (nextFavorites.has(slug)) {
        nextFavorites.delete(slug);
      } else {
        nextFavorites.add(slug);
      }

      return nextFavorites;
    });
  }

  formatNumber(value: number, fractionDigits = 0) {
    return formatNumber(value, fractionDigits);
  }

  hideColumn(columnKey: TableColumnKey, event?: Event) {
    event?.stopPropagation();
    if (this.hiddenColumns().has(columnKey) || TABLE_COLUMNS.length - this.hiddenColumns().size <= 1) {
      return;
    }

    const nextHiddenColumns = new Set(this.hiddenColumns());
    nextHiddenColumns.add(columnKey);
    this.hiddenColumns.set(nextHiddenColumns);

    if (this.sortKey() === columnKey) {
      const fallbackSortKey = this.getFallbackSortKey(nextHiddenColumns);
      this.sortKey.set(fallbackSortKey);
      this.sortDirection.set(fallbackSortKey === 'name' || fallbackSortKey === 'region' ? 'asc' : 'desc');
    }
  }

  showHiddenColumns() {
    this.hiddenColumns.set(new Set());
  }

  getMonthlyChart(metricKey: MetricKey, city: CityMetric, compareCity: CityMetric | null): MonthlyChart | null {
    return createMonthlyChart(metricKey, city, compareCity);
  }

  private getFallbackSortKey(hiddenColumns: Set<TableColumnKey>): SortKey {
    if (!hiddenColumns.has('score')) {
      return 'score';
    }

    return (
      TABLE_COLUMNS.find(
        (columnKey): columnKey is Exclude<TableColumnKey, 'favorite'> =>
          columnKey !== 'favorite' && !hiddenColumns.has(columnKey)
      ) ?? 'name'
    );
  }

  private setCustomCriteria(criteria: Record<MetricKey, CriterionState>) {
    const nextCriteria = cloneCriteria(criteria);
    this.criteria.set(nextCriteria);
    this.customCriteria.set(nextCriteria);
    this.selectedPresetId.set('custom');
  }
}
