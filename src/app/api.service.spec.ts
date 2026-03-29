import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { WeatherDataService } from './api.service';
import { DashboardData } from './types';

const mockDashboard: DashboardData = {
  generatedAt: '2026-03-29T12:00:00.000Z',
  sourcePeriod: { startYear: 2015, endYear: 2024 },
  criteria: [],
  notes: [],
  presets: [],
  cities: []
};

describe('WeatherDataService', () => {
  let service: WeatherDataService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), WeatherDataService]
    });

    service = TestBed.inject(WeatherDataService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('loads the static dashboard JSON', async () => {
    const dashboardPromise = service.loadDashboard();
    const request = httpTesting.expectOne('data/dashboard.json');

    expect(request.request.method).toBe('GET');
    request.flush(mockDashboard);

    await expect(dashboardPromise).resolves.toEqual(mockDashboard);
  });
});
