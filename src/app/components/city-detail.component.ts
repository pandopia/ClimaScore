import { Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { formatNumber } from '../formatters';
import { createMonthlyChart } from '../monthly-chart';
import { computeMetricStats } from '../scoring';
import { CityMetric, CriterionDefinition, CriterionState, MetricKey, ScoredCity } from '../types';

interface TrendPreviewState {
  metricKey: MetricKey;
  top: number;
  left: number;
}

function detectHoverPreviewSupport() {
  if (typeof globalThis.matchMedia === 'function') {
    return globalThis.matchMedia('(hover: hover) and (pointer: fine)').matches;
  }

  return !('ontouchstart' in globalThis);
}

@Component({
  selector: 'app-city-detail',
  imports: [FormsModule],
  templateUrl: './city-detail.component.html'
})
export class CityDetailComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly hoverMediaQuery =
    typeof globalThis.matchMedia === 'function' ? globalThis.matchMedia('(hover: hover) and (pointer: fine)') : null;

  readonly city = input<ScoredCity | null>(null);
  readonly compareCity = input<CityMetric | null>(null);
  readonly compareOptions = input<CityMetric[]>([]);
  readonly referenceCities = input<CityMetric[]>([]);
  readonly criteriaDefinitions = input<CriterionDefinition[]>([]);
  readonly criteriaState = input<Record<MetricKey, CriterionState>>({} as Record<MetricKey, CriterionState>);
  readonly favorites = input<Set<string>>(new Set());
  readonly totalCityCount = input(0);

  readonly compareCityChange = output<string>();
  readonly favoriteToggle = output<string>();
  readonly prefersHoverTrend = signal(detectHoverPreviewSupport());
  readonly hoverTrend = signal<TrendPreviewState | null>(null);
  readonly trendMetricKey = signal<MetricKey | null>(null);
  readonly hoverTrendCriterion = computed(
    () => this.criteriaDefinitions().find((criterion) => criterion.key === this.hoverTrend()?.metricKey) ?? null
  );
  readonly hoverTrendChart = computed(() => {
    const metricKey = this.hoverTrend()?.metricKey;
    const city = this.city();
    if (!metricKey || !city) {
      return null;
    }

    return createMonthlyChart(metricKey, city, this.compareCity());
  });
  readonly trendCriterion = computed(
    () => this.criteriaDefinitions().find((criterion) => criterion.key === this.trendMetricKey()) ?? null
  );
  readonly trendChart = computed(() => {
    const metricKey = this.trendMetricKey();
    const city = this.city();
    if (!metricKey || !city) {
      return null;
    }

    return createMonthlyChart(metricKey, city, this.compareCity());
  });

  constructor() {
    const mediaQuery = this.hoverMediaQuery;
    if (!mediaQuery || typeof mediaQuery.addEventListener !== 'function') {
      return;
    }

    const updatePointerMode = (event: MediaQueryListEvent) => {
      this.prefersHoverTrend.set(event.matches);
      if (!event.matches) {
        this.hoverTrend.set(null);
      }
    };

    mediaQuery.addEventListener('change', updatePointerMode);
    this.destroyRef.onDestroy(() => {
      mediaQuery.removeEventListener('change', updatePointerMode);
    });
  }

  isFavorite(slug: string) {
    return this.favorites().has(slug);
  }

  toggleFavorite(slug: string, event: Event) {
    event.stopPropagation();
    this.favoriteToggle.emit(slug);
  }

  selectCompareCity(slug: string) {
    this.compareCityChange.emit(slug);
  }

  showTrendPreview(metricKey: MetricKey, target: EventTarget | null) {
    if (!this.prefersHoverTrend()) {
      return;
    }

    const button = target instanceof HTMLElement ? target : null;
    if (!button) {
      return;
    }

    const rect = button.getBoundingClientRect();
    const viewportWidth = globalThis.innerWidth || 0;
    const viewportHeight = globalThis.innerHeight || 0;
    const popoverWidth = Math.min(360, Math.max(280, viewportWidth - 32));
    const popoverHeight = 286;
    const margin = 16;
    let left = rect.left + rect.width / 2 - popoverWidth / 2;
    let top = rect.top - popoverHeight - 12;

    left = Math.max(margin, Math.min(left, viewportWidth - popoverWidth - margin));
    if (top < margin) {
      top = Math.min(rect.bottom + 12, Math.max(margin, viewportHeight - popoverHeight - margin));
    }

    this.hoverTrend.set({ metricKey, top, left });
  }

  hideTrendPreview() {
    this.hoverTrend.set(null);
  }

  openTrend(metricKey: MetricKey, event: Event) {
    event.stopPropagation();
    if (this.prefersHoverTrend()) {
      return;
    }

    this.hoverTrend.set(null);
    this.trendMetricKey.set(metricKey);
  }

  closeTrend() {
    this.trendMetricKey.set(null);
  }

  formatNumber(value: number, fractionDigits = 0) {
    return formatNumber(value, fractionDigits);
  }

  getCriterionDelta(metricKey: MetricKey, city: CityMetric, compareCity: CityMetric | null) {
    if (!compareCity) {
      return null;
    }

    return city[metricKey] - compareCity[metricKey];
  }

  formatSignedDelta(value: number | null, fractionDigits = 1) {
    if (value === null) {
      return '';
    }

    const formatted = formatNumber(Math.abs(value), fractionDigits);
    if (value === 0) {
      return '0';
    }

    return `${value > 0 ? '+' : '-'}${formatted}`;
  }

  getDeltaTone(metricKey: MetricKey, city: CityMetric, compareCity: CityMetric | null) {
    const criterionState = this.criteriaState()[metricKey];
    if (!criterionState?.enabled || criterionState.weight <= 0) {
      return 'inactive';
    }

    if (!compareCity) {
      return 'neutral';
    }

    const delta = this.getCriterionDelta(metricKey, city, compareCity);
    if (delta === null || delta === 0) {
      return 'neutral';
    }

    if (criterionState.direction === 'average') {
      const referenceCities = this.referenceCities();
      const stats = computeMetricStats(referenceCities.length ? referenceCities : [city, compareCity], metricKey);
      const cityDistance = Math.abs(city[metricKey] - stats.mean);
      const compareDistance = Math.abs(compareCity[metricKey] - stats.mean);

      if (cityDistance === compareDistance) {
        return 'neutral';
      }

      return cityDistance < compareDistance ? 'positive' : 'negative';
    }

    if (criterionState.direction === 'minimize') {
      return delta < 0 ? 'positive' : 'negative';
    }

    return delta > 0 ? 'positive' : 'negative';
  }

  getMonthlyChart(metricKey: MetricKey, city: CityMetric, compareCity: CityMetric | null) {
    return createMonthlyChart(metricKey, city, compareCity);
  }
}
