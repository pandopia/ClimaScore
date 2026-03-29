import { Component, input, output } from '@angular/core';
import { formatNumber } from '../formatters';
import { getColumnTooltip, getHiddenColumnsLinkLabel, getHideColumnLabel, TABLE_COLUMN_DEFINITIONS } from '../table-columns';
import { CriterionDefinition, MetricKey, ScoredCity, SortKey, TableColumnKey } from '../types';

@Component({
  selector: 'app-ranking-table',
  templateUrl: './ranking-table.component.html'
})
export class RankingTableComponent {
  readonly cities = input<ScoredCity[]>([]);
  readonly selectedSlug = input<string | null>(null);
  readonly hiddenColumns = input<Set<TableColumnKey>>(new Set());
  readonly sortKey = input<SortKey>('score');
  readonly sortDirection = input<'asc' | 'desc'>('desc');
  readonly favorites = input<Set<string>>(new Set());
  readonly criteria = input<CriterionDefinition[]>([]);

  readonly citySelect = output<string>();
  readonly favoriteToggle = output<string>();
  readonly sortChange = output<SortKey>();
  readonly columnHide = output<TableColumnKey>();
  readonly hiddenColumnsReset = output<void>();

  readonly columns = TABLE_COLUMN_DEFINITIONS;

  trackBySlug(_index: number, city: ScoredCity) {
    return city.slug;
  }

  isColumnHidden(columnKey: TableColumnKey) {
    return this.hiddenColumns().has(columnKey);
  }

  canHideColumn(columnKey: TableColumnKey) {
    return !this.hiddenColumns().has(columnKey) && this.visibleColumnCount() > 1;
  }

  isFavorite(slug: string) {
    return this.favorites().has(slug);
  }

  isSortedBy(sortKey: SortKey) {
    return this.sortKey() === sortKey;
  }

  getSortIndicator(sortKey: SortKey) {
    if (!this.isSortedBy(sortKey)) {
      return '';
    }

    return this.sortDirection() === 'asc' ? '▲' : '▼';
  }

  getColumnTooltip(columnKey: TableColumnKey) {
    return getColumnTooltip(this.criteria(), columnKey);
  }

  getHideColumnLabel(columnKey: TableColumnKey) {
    return getHideColumnLabel(columnKey);
  }

  getHiddenColumnsLinkLabel() {
    return getHiddenColumnsLinkLabel(this.hiddenColumnCount());
  }

  hiddenColumnCount() {
    return this.hiddenColumns().size;
  }

  visibleColumnCount() {
    return this.columns.length - this.hiddenColumns().size;
  }

  tableColspan() {
    return Math.max(1, this.visibleColumnCount());
  }

  formatValue(value: number, fractionDigits = 1) {
    return formatNumber(value, fractionDigits);
  }

  formatMetricValue(city: ScoredCity, columnKey: MetricKey, fractionDigits = 1) {
    return this.formatValue(city[columnKey], fractionDigits);
  }

  toggleFavorite(slug: string, event: Event) {
    event.stopPropagation();
    this.favoriteToggle.emit(slug);
  }

  hideColumn(columnKey: TableColumnKey, event: Event) {
    event.stopPropagation();
    if (!this.canHideColumn(columnKey)) {
      return;
    }

    this.columnHide.emit(columnKey);
  }
}
