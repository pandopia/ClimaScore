import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './app';
import { WeatherDataService } from './api.service';
import { USER_STATE_STORAGE_KEY } from './user-state';
import { DashboardData } from './types';

const monthlyMetrics = {
  sunnyDaysAvg: [5, 7, 9, 12, 15, 18, 20, 19, 15, 11, 7, 5],
  rainyDaysAvg: [12, 10, 10, 9, 8, 7, 6, 6, 8, 10, 11, 12],
  cloudyDaysAvg: [14, 12, 10, 8, 7, 5, 4, 4, 6, 8, 11, 13],
  rainfallMmAvg: [90, 75, 72, 79, 88, 71, 57, 61, 82, 93, 107, 125],
  sunHoursAvg: [78, 98, 126, 154, 186, 215, 242, 231, 170, 128, 89, 70],
  hotDays30Avg: [0, 0, 0, 0, 1, 2, 5, 6, 1, 0, 0, 0],
  windyDaysAvg: [5, 4, 4, 3, 3, 2, 2, 2, 3, 4, 4, 5],
  uvIndexAvg: [0.8, 1.1, 1.9, 2.8, 3.8, 4.7, 5.0, 4.3, 3.0, 1.8, 1.0, 0.7],
  humidityAvg: [79, 77, 74, 71, 72, 69, 67, 68, 72, 77, 80, 81],
  summerMaxTempAvg: [11, 12, 14, 17, 20, 23, 25, 25, 22, 18, 14, 11]
};

const defaultCriteria = {
  sunnyDaysAvg: { enabled: true, weight: 10, direction: 'maximize' as const },
  rainyDaysAvg: { enabled: true, weight: 6, direction: 'minimize' as const },
  cloudyDaysAvg: { enabled: true, weight: 9, direction: 'minimize' as const },
  rainfallMmAvg: { enabled: true, weight: 5, direction: 'minimize' as const },
  sunHoursAvg: { enabled: true, weight: 10, direction: 'maximize' as const },
  hotDays30Avg: { enabled: true, weight: 6, direction: 'maximize' as const },
  windyDaysAvg: { enabled: true, weight: 3, direction: 'minimize' as const },
  uvIndexAvg: { enabled: true, weight: 7, direction: 'maximize' as const },
  humidityAvg: { enabled: true, weight: 4, direction: 'minimize' as const },
  summerMaxTempAvg: { enabled: true, weight: 7, direction: 'maximize' as const }
};

const mockDashboard: DashboardData = {
  generatedAt: '2026-03-29T12:00:00.000Z',
  sourcePeriod: { startYear: 2015, endYear: 2024 },
  criteria: [
    {
      key: 'sunnyDaysAvg',
      label: 'Jours très ensoleillés',
      shortLabel: 'Soleil',
      unit: 'j/an',
      description: '',
      source: 'Météo-France',
      coverage: '2015-2024'
    },
    {
      key: 'rainyDaysAvg',
      label: 'Jours de pluie',
      shortLabel: 'Pluie',
      unit: 'j/an',
      description: '',
      source: 'Météo-France',
      coverage: '2015-2024'
    },
    {
      key: 'cloudyDaysAvg',
      label: 'Jours très nuageux',
      shortLabel: 'Nuages',
      unit: 'j/an',
      description: '',
      source: 'Météo-France',
      coverage: '2015-2024'
    },
    {
      key: 'rainfallMmAvg',
      label: 'Pluviométrie annuelle',
      shortLabel: 'Mm',
      unit: 'mm/an',
      description: '',
      source: 'Météo-France',
      coverage: '2015-2024'
    },
    {
      key: 'sunHoursAvg',
      label: 'Heures d’ensoleillement',
      shortLabel: 'Heures',
      unit: 'h/an',
      description: '',
      source: 'Météo-France',
      coverage: '2015-2024'
    },
    {
      key: 'hotDays30Avg',
      label: 'Jours >= 30°C',
      shortLabel: 'Chaud',
      unit: 'j/an',
      description: '',
      source: 'Météo-France',
      coverage: '2015-2024'
    },
    {
      key: 'windyDaysAvg',
      label: 'Jours venteux',
      shortLabel: 'Vent',
      unit: 'j/an',
      description: '',
      source: 'Météo-France',
      coverage: '2015-2024'
    },
    {
      key: 'uvIndexAvg',
      label: 'Indice UV moyen',
      shortLabel: 'UV',
      unit: 'indice',
      description: '',
      source: 'Open-Meteo historical forecast',
      coverage: '2022-2024'
    },
    {
      key: 'humidityAvg',
      label: 'Humidité moyenne',
      shortLabel: 'Humidité',
      unit: '%',
      description: '',
      source: 'Météo-France',
      coverage: '2015-2024'
    },
    {
      key: 'summerMaxTempAvg',
      label: 'Max moyenne été',
      shortLabel: 'Été',
      unit: '°C',
      description: '',
      source: 'Météo-France',
      coverage: '2015-2024'
    }
  ],
  presets: [
    {
      id: 'sun-lover',
      label: 'Sun lover',
      isDefault: true,
      criteria: defaultCriteria
    },
    {
      id: 'pluviophile',
      label: 'Pluviophile',
      isDefault: false,
      criteria: {
        sunnyDaysAvg: { enabled: true, weight: 7, direction: 'minimize' as const },
        rainyDaysAvg: { enabled: true, weight: 10, direction: 'maximize' as const },
        cloudyDaysAvg: { enabled: true, weight: 8, direction: 'maximize' as const },
        rainfallMmAvg: { enabled: true, weight: 10, direction: 'maximize' as const },
        sunHoursAvg: { enabled: true, weight: 7, direction: 'minimize' as const },
        hotDays30Avg: { enabled: true, weight: 6, direction: 'minimize' as const },
        windyDaysAvg: { enabled: true, weight: 3, direction: 'minimize' as const },
        uvIndexAvg: { enabled: true, weight: 5, direction: 'minimize' as const },
        humidityAvg: { enabled: true, weight: 8, direction: 'maximize' as const },
        summerMaxTempAvg: { enabled: true, weight: 7, direction: 'minimize' as const }
      }
    }
  ],
  notes: ['Donnees statiques locales.'],
  cities: [
    {
      slug: 'pau',
      name: 'Pau',
      region: 'Nouvelle-Aquitaine',
      metroPopulation: 200000,
      sunnyDaysAvg: 120,
      rainyDaysAvg: 105,
      cloudyDaysAvg: 95,
      rainfallMmAvg: 1000,
      sunHoursAvg: 1800,
      hotDays30Avg: 6,
      windyDaysAvg: 40,
      uvIndexAvg: 2.6,
      humidityAvg: 73,
      summerMaxTempAvg: 25,
      monthlyMetrics,
      stationName: 'PAU-UZEIN',
      stationDistanceKm: 8,
      dataCoverage: 98
    },
    {
      slug: 'nantes',
      name: 'Nantes',
      region: 'Pays de la Loire',
      metroPopulation: 710000,
      sunnyDaysAvg: 115,
      rainyDaysAvg: 110,
      cloudyDaysAvg: 92,
      rainfallMmAvg: 820,
      sunHoursAvg: 1760,
      hotDays30Avg: 4,
      windyDaysAvg: 34,
      uvIndexAvg: 2.4,
      humidityAvg: 75,
      summerMaxTempAvg: 24,
      monthlyMetrics,
      stationName: 'NANTES-BOUGUENAIS',
      stationDistanceKm: 6,
      dataCoverage: 99
    },
    {
      slug: 'brest',
      name: 'Brest',
      region: 'Bretagne',
      metroPopulation: 300000,
      sunnyDaysAvg: 110,
      rainyDaysAvg: 120,
      cloudyDaysAvg: 100,
      rainfallMmAvg: 1200,
      sunHoursAvg: 1700,
      hotDays30Avg: 2,
      windyDaysAvg: 55,
      uvIndexAvg: 2.1,
      humidityAvg: 78,
      summerMaxTempAvg: 22,
      monthlyMetrics,
      stationName: 'BREST-GUIPAVAS',
      stationDistanceKm: 7,
      dataCoverage: 99
    }
  ]
};

describe('App', () => {
  beforeEach(async () => {
    globalThis.localStorage?.clear();
    globalThis.history.replaceState({}, '', '/');

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        {
          provide: WeatherDataService,
          useValue: {
            loadDashboard: () => Promise.resolve(mockDashboard)
          }
        }
      ]
    }).compileComponents();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.localStorage?.clear();
    globalThis.history.replaceState({}, '', '/');
  });

  it('should create the app', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render dashboard title', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('ClimaScore');
  });

  it('migrates legacy favorites into the new user state', async () => {
    globalThis.localStorage?.setItem('meteoweight:favorites', JSON.stringify(['pau']));

    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    expect(fixture.componentInstance.isFavorite('pau')).toBe(true);

    const storedState = JSON.parse(globalThis.localStorage?.getItem(USER_STATE_STORAGE_KEY) ?? '{}');
    expect(storedState.favorites).toEqual(['pau']);
    expect(globalThis.localStorage?.getItem('meteoweight:favorites')).toBeNull();
  });

  it('restores filters and the custom preset from localStorage', async () => {
    const customCriteria = {
      ...defaultCriteria,
      uvIndexAvg: { enabled: true, weight: 6, direction: 'minimize' as const }
    };

    globalThis.localStorage?.setItem(
      USER_STATE_STORAGE_KEY,
      JSON.stringify({
        favorites: ['brest', 'pau'],
        hiddenColumns: ['uvIndexAvg'],
        selectedPresetId: 'custom',
        customCriteria,
        namedPresets: [],
        query: 'Bre',
        region: 'Bretagne',
        minPopulation: 250000,
        showOnlyFavorites: true,
        sortKey: 'name',
        sortDirection: 'asc',
        selectedSlug: 'brest',
        compareSlug: 'pau'
      })
    );

    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const app = fixture.componentInstance;

    expect(app.selectedPresetId()).toBe('custom');
    expect(app.query()).toBe('Bre');
    expect(app.showOnlyFavorites()).toBe(true);
    expect(app.isFavorite('brest')).toBe(true);
    expect(app.isColumnHidden('uvIndexAvg')).toBe(true);
    expect(app.criteria().uvIndexAvg.weight).toBe(6);
    expect(app.selectedCity()?.slug).toBe('brest');
    expect(app.compareCity()).toBeNull();
  });

  it('saves named presets locally', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const app = fixture.componentInstance;

    app.presetNameDraft.set('Bord de mer');
    app.saveCurrentPreset();
    fixture.detectChanges();
    await fixture.whenStable();

    const storedState = JSON.parse(globalThis.localStorage?.getItem(USER_STATE_STORAGE_KEY) ?? '{}');
    expect(storedState.selectedPresetId).toBe('saved-bord-de-mer');
    expect(storedState.namedPresets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'saved-bord-de-mer',
          label: 'Bord de mer'
        })
      ])
    );
    expect(app.presetFeedback()).toContain('Calcul "Bord de mer"');
  });

  it('deletes a saved calculation and falls back to the default one', async () => {
    const confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValue(true);
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const app = fixture.componentInstance;

    app.presetNameDraft.set('Bord de mer');
    app.saveCurrentPreset();
    fixture.detectChanges();
    await fixture.whenStable();

    app.deletePreset('saved-bord-de-mer');
    fixture.detectChanges();
    await fixture.whenStable();

    const storedState = JSON.parse(globalThis.localStorage?.getItem(USER_STATE_STORAGE_KEY) ?? '{}');
    expect(confirmSpy).toHaveBeenCalledWith('Supprimer le calcul "Bord de mer" ?');
    expect(app.selectedPresetId()).toBe('sun-lover');
    expect(app.namedPresets()).toHaveLength(0);
    expect(storedState.selectedPresetId).toBe('sun-lover');
    expect(storedState.namedPresets).toEqual([]);
  });

  it('builds a custom score from the climate finder answers', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const app = fixture.componentInstance;

    app.setClimateFinderAnswer('sky', 'sunny');
    app.setClimateFinderAnswer('rain', 'avoid');
    app.setClimateFinderAnswer('summer', 'warm');
    app.setClimateFinderAnswer('comfort', 'calm');
    app.setClimateFinderAnswer('priority', 'sun');
    app.applyClimateFinder();

    expect(app.selectedPresetId()).toBe('custom');
    expect(app.criteria().sunnyDaysAvg).toEqual({ enabled: true, weight: 10, direction: 'maximize' });
    expect(app.criteria().sunHoursAvg).toEqual({ enabled: true, weight: 10, direction: 'maximize' });
    expect(app.criteria().cloudyDaysAvg).toEqual({ enabled: true, weight: 10, direction: 'minimize' });
    expect(app.criteria().rainfallMmAvg).toEqual({ enabled: true, weight: 8, direction: 'minimize' });
    expect(app.criteria().windyDaysAvg).toEqual({ enabled: true, weight: 8, direction: 'minimize' });
    expect(app.presetNameDraft()).toBe('Mon climat idéal');
    expect(app.presetFeedback()).toContain('Calcul personnalisé appliqué');
  });

  it('clears the search query when favorites-only is enabled', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const app = fixture.componentInstance;

    app.query.set('Pau');
    app.setShowOnlyFavorites(true);

    expect(app.showOnlyFavorites()).toBe(true);
    expect(app.query()).toBe('');
  });

  it('sorts the ranking by favorites when the Fav column is selected', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const app = fixture.componentInstance;

    app.toggleFavorite('brest');
    app.setSort('favorite');

    expect(app.sortKey()).toBe('favorite');
    expect(app.sortDirection()).toBe('desc');
    expect(app.filteredScoredCities()[0]?.slug).toBe('brest');

    app.setSort('favorite');

    expect(app.sortDirection()).toBe('asc');
    expect(app.filteredScoredCities().at(-1)?.slug).toBe('brest');
  });

  it('matches the search query against region names too', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const app = fixture.componentInstance;

    app.query.set('loire');

    expect(app.filteredScoredCities().map((city) => city.slug)).toContain('nantes');
  });

  it('keeps the explicit city selection when a temporary filter hides it', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const app = fixture.componentInstance;

    app.selectCity('pau');
    app.query.set('brest');

    expect(app.selectedSlug()).toBe('pau');
    expect(app.selectedCity()?.slug).toBe('brest');

    app.query.set('');

    expect(app.selectedCity()?.slug).toBe('pau');
  });

  it('scopes comparison options to the currently visible cities', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const app = fixture.componentInstance;

    app.query.set('loire');

    expect(app.filteredScoredCities().map((city) => city.slug)).toEqual(['nantes']);
    expect(app.compareOptions()).toEqual([]);
    expect(app.compareCity()).toBeNull();
  });

  it('loads city, comparison and preset from the shareable URL', async () => {
    globalThis.history.replaceState({}, '', '/?city=pau&compare=brest&preset=pluviophile');

    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const app = fixture.componentInstance;

    expect(app.selectedSlug()).toBe('pau');
    expect(app.compareSlug()).toBe('brest');
    expect(app.selectedPresetId()).toBe('pluviophile');
    expect(app.criteria().rainyDaysAvg.direction).toBe('maximize');
  });

  it('syncs the URL with the selected city, comparison and current calculation', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const app = fixture.componentInstance;

    app.selectCity('nantes');
    app.selectCompareCity('pau');
    app.applyPreset('pluviophile');
    fixture.detectChanges();
    await fixture.whenStable();

    const url = new URL(globalThis.location.href);
    expect(url.searchParams.get('city')).toBe('nantes');
    expect(url.searchParams.get('compare')).toBe('pau');
    expect(url.searchParams.get('preset')).toBe('pluviophile');
  });

  it('limits the summer max chart to June through August', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const app = fixture.componentInstance;
    const [pau, brest] = mockDashboard.cities;

    const summerChart = app.getMonthlyChart('summerMaxTempAvg', pau, brest);
    const sunChart = app.getMonthlyChart('sunnyDaysAvg', pau, brest);

    expect(summerChart?.periodLabel).toBe('Juin à août');
    expect(summerChart?.monthLabels.map((month) => month.label)).toEqual(['Juin', 'Juil', 'Aoû']);
    expect(sunChart?.periodLabel).toBe('Janvier à décembre');
    expect(sunChart?.monthLabels.map((month) => month.label)).toEqual([
      'Jan',
      'Fév',
      'Mar',
      'Avr',
      'Mai',
      'Juin',
      'Juil',
      'Aoû',
      'Sep',
      'Oct',
      'Nov',
      'Déc'
    ]);
  });
});
