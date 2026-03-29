import { formatNumber } from './formatters';
import { CityMetric, MetricKey } from './types';

const YEAR_MONTH_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
const SUMMER_MONTH_LABELS = ['Juin', 'Juil', 'Aoû'];
const SUMMER_MONTH_INDICES = [5, 6, 7];
const MONTHLY_CHART_LAYOUT = {
  width: 264,
  height: 168,
  paddingLeft: 20,
  paddingRight: 10,
  paddingTop: 12,
  paddingBottom: 28
};
const MONTHLY_CHART_COLORS = {
  primary: '#0f5449',
  compare: '#c67b2f'
};

export interface MonthlyChartLine {
  color: string;
  label: string;
  path: string;
}

export interface MonthlyChart {
  viewBox: string;
  periodLabel: string;
  monthLabels: Array<{ label: string; x: number }>;
  gridLines: number[];
  yAxisTicks: Array<{ label: string; y: number }>;
  yAxisX: number;
  xAxisY: number;
  chartLeft: number;
  chartRight: number;
  lines: MonthlyChartLine[];
}

function isFiniteMetricValue(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function createMonthlyChart(metricKey: MetricKey, city: CityMetric, compareCity: CityMetric | null): MonthlyChart | null {
  const isSummerOnlyMetric = metricKey === 'summerMaxTempAvg';
  const monthLabels = isSummerOnlyMetric ? SUMMER_MONTH_LABELS : YEAR_MONTH_LABELS;
  const periodLabel = isSummerOnlyMetric ? 'Juin à août' : 'Janvier à décembre';
  const selectSeriesValues = (values: Array<number | null> | undefined) => {
    const seriesValues = values ?? [];
    return isSummerOnlyMetric ? SUMMER_MONTH_INDICES.map((index) => seriesValues[index] ?? null) : seriesValues;
  };
  const primarySeries = selectSeriesValues(city.monthlyMetrics?.[metricKey]);
  const series = [
    {
      color: MONTHLY_CHART_COLORS.primary,
      label: city.name,
      values: primarySeries
    }
  ];

  if (compareCity) {
    series.push({
      color: MONTHLY_CHART_COLORS.compare,
      label: compareCity.name,
      values: selectSeriesValues(compareCity.monthlyMetrics?.[metricKey])
    });
  }

  const numericValues = series.flatMap((line) => line.values.filter(isFiniteMetricValue));
  if (!numericValues.length) {
    return null;
  }

  const { width, height, paddingLeft, paddingRight, paddingTop, paddingBottom } = MONTHLY_CHART_LAYOUT;
  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;
  const xStep = monthLabels.length > 1 ? plotWidth / (monthLabels.length - 1) : 0;
  const rawMax = Math.max(...numericValues);
  const domainMin = 0;
  const domainMax = rawMax === 0 ? 1 : rawMax * 1.08;
  const valueRange = domainMax - domainMin || 1;
  const toY = (value: number) => paddingTop + ((domainMax - value) / valueRange) * plotHeight;
  const toX = (index: number) => paddingLeft + index * xStep;
  const buildPath = (values: Array<number | null>) => {
    let path = '';
    let started = false;

    values.forEach((value, index) => {
      if (!isFiniteMetricValue(value)) {
        started = false;
        return;
      }

      path += `${started ? ' L' : 'M'} ${toX(index).toFixed(1)} ${toY(value).toFixed(1)}`;
      started = true;
    });

    return path.trim();
  };

  return {
    viewBox: `0 0 ${width} ${height}`,
    periodLabel,
    monthLabels: monthLabels.map((label, index) => ({
      label,
      x: toX(index)
    })),
    gridLines: [0, 0.5, 1].map((ratio) => paddingTop + plotHeight * ratio),
    yAxisTicks: [domainMax, domainMax / 2, domainMin].map((value) => ({
      label: formatNumber(value, 1),
      y: toY(value)
    })),
    yAxisX: paddingLeft,
    xAxisY: paddingTop + plotHeight,
    chartLeft: paddingLeft,
    chartRight: paddingLeft + plotWidth,
    lines: series
      .map((line) => ({
        color: line.color,
        label: line.label,
        path: buildPath(line.values)
      }))
      .filter((line) => line.path)
  };
}
