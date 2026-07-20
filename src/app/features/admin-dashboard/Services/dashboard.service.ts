// src/app/features/dashboard/services/dashboard.service.ts

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { DashboardDto } from '../models/Dashboard/DashboardDto';
import { CasesStatisticsDto } from '../models/Dashboard/CasesStatisticsDto';
import { ApiResponse } from '../../../shared/models/responses/api-response.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.baseUrl}/api/Dashboard`;

  getDashboard(): Observable<ApiResponse<DashboardDto>> {
    return this.http.get<ApiResponse<DashboardDto>>(this.baseUrl);
  }

  getCasesStatistics(): Observable<ApiResponse<CasesStatisticsDto>> {
    return this.http.get<ApiResponse<CasesStatisticsDto>>(`${this.baseUrl}/cases-statistics`);
  }
}
