import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { DashboardDto } from '../models/Dashboard/DashboardDto';
import { CasesStatisticsDto } from '../models/Dashboard/CasesStatisticsDto';
import { ApiResponse } from '../../../shared/models/responses/api-response.model';
import { PaginationResponse } from '../../../shared/models/responses/pagination-response.model';
import { AuditLogDto, AuditLogQueryDto } from '../models/Dashboard/audit-log.dto';

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

  getAuditLogs(query: AuditLogQueryDto): Observable<ApiResponse<PaginationResponse<AuditLogDto>>> {
    let params: any = {
      pageNumber: query.pageNumber,
      pageSize: query.pageSize
    };
    if (query.searchEmail) params.searchEmail = query.searchEmail;
    if (query.searchTable) params.searchTable = query.searchTable;
    if (query.searchType) params.searchType = query.searchType;

    return this.http.get<ApiResponse<PaginationResponse<AuditLogDto>>>(`${this.baseUrl}/audit-logs`, { params });
  }
}
