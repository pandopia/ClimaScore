import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { DashboardData } from './types';

@Injectable({ providedIn: 'root' })
export class WeatherDataService {
  private readonly http = inject(HttpClient);

  loadDashboard() {
    return firstValueFrom(this.http.get<DashboardData>('data/dashboard.json'));
  }
}
