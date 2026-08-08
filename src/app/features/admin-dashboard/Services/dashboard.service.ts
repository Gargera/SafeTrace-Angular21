import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { DashboardDto } from '../models/Dashboard/responses/DashboardDto';
import { CasesStatisticsDto } from '../models/Dashboard/responses/CasesStatisticsDto';
import { ApiResponse } from '../../../shared/models/responses/api-response.model';
import { PaginationResponse } from '../../../shared/models/responses/pagination-response.model';
import { AuditLogDto, AuditLogQueryDto } from '../models/Dashboard/responses/audit-log.dto';
import { CacheService } from '../../../core/cache/cache.service';
import { CACHE_TAGS, CACHE_TTL } from '../../../core/cache/cache.constants';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.baseUrl}/api/Dashboard`;
  private readonly cacheService = inject(CacheService);

  getDashboard(): Observable<ApiResponse<DashboardDto>> {
    const key = `Dashboard_getDashboard`;
    return this.cacheService.getOrSet(
      key,
      () => this.http.get<ApiResponse<DashboardDto>>(this.baseUrl),
      CACHE_TTL.LIST,
      [CACHE_TAGS.DASHBOARD]
    );
  }

  getCasesStatistics(): Observable<ApiResponse<CasesStatisticsDto>> {
    const key = `Dashboard_getCasesStatistics`;
    return this.cacheService.getOrSet(
      key,
      () => this.http.get<ApiResponse<CasesStatisticsDto>>(`${this.baseUrl}/cases-statistics`),
      CACHE_TTL.LIST,
      [CACHE_TAGS.DASHBOARD]
    );
  }

  getAuditLogs(query: AuditLogQueryDto): Observable<ApiResponse<PaginationResponse<AuditLogDto>>> {
    let params: any = {
      pageNumber: query.pageNumber,
      pageSize: query.pageSize
    };
    if (query.searchEmail) params.searchEmail = query.searchEmail;
    if (query.searchTable) params.searchTable = query.searchTable;
    if (query.searchType) params.searchType = query.searchType;

    const key = `Dashboard_getAuditLogs_${JSON.stringify(params)}`;
    return this.cacheService.getOrSet(
      key,
      () => this.http.get<ApiResponse<PaginationResponse<AuditLogDto>>>(`${this.baseUrl}/audit-logs`, { params }),
      CACHE_TTL.LIST,
      [CACHE_TAGS.DASHBOARD]
    );
  }
}
