import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../shared/models/api-response.model';
import { ApiService } from '../../../shared/services/api.service';
import { ComplaintStatisticsDto } from '../models/responses/complaint-statistics-dto';
import { ComplaintResponseDto, PaginationResponse } from '../models/responses/complaint.model';
import { ComplaintFilterDto } from '../models/requests/complaint-filter.model';
import { ResolveComplaintDto } from '../models/requests/resolve-complaint.model';
import { CacheService } from '../../../core/cache/cache.service';
import { CACHE_TAGS, CACHE_TTL } from '../../../core/cache/cache.constants';

@Injectable({ providedIn: 'root' })
export class ComplaintsService extends ApiService {
  private readonly baseUrl = `${environment.baseUrl}/api/Complaints`;
  private readonly cacheService = inject(CacheService);

  getStatistics(): Observable<ApiResponse<ComplaintStatisticsDto>> {
    const key = `Complaints_Statistics`;
    return this.cacheService.getOrSet(
      key,
      () => this.get<ApiResponse<ComplaintStatisticsDto>>(`${this.baseUrl}/statistics`),
      CACHE_TTL.LIST,
      [CACHE_TAGS.COMPLAINTS]
    );
  }

  getAll(filter: ComplaintFilterDto): Observable<ApiResponse<PaginationResponse<ComplaintResponseDto>>> {
    const key = `Complaints_getAll_${JSON.stringify(filter)}`;
    return this.cacheService.getOrSet(
      key,
      () => this.get<ApiResponse<PaginationResponse<ComplaintResponseDto>>>(
        this.baseUrl,
        filter as Record<string, any>
      ),
      CACHE_TTL.LIST,
      [CACHE_TAGS.COMPLAINTS]
    );
  }

  getComplaintById(id: number): Observable<ApiResponse<ComplaintResponseDto>> {
    const key = `Complaints_getById_${id}`;
    return this.cacheService.getOrSet(
      key,
      () => this.getById<ApiResponse<ComplaintResponseDto>>(this.baseUrl, id),
      CACHE_TTL.DETAILS,
      [CACHE_TAGS.COMPLAINTS]
    );
  }

  createComplaint(data: { caseCode?: string; message: string }): Observable<ApiResponse<ComplaintResponseDto>> {
    return this.post<ApiResponse<ComplaintResponseDto>>(this.baseUrl, data).pipe(
      tap(() => this.cacheService.invalidateByTags([CACHE_TAGS.COMPLAINTS]))
    );
  }

  resolve(id: number, dto: ResolveComplaintDto): Observable<ApiResponse<string>> {
    return this.put<ApiResponse<string>>(`${this.baseUrl}/${id}/resolve`, dto).pipe(
      tap(() => this.cacheService.invalidateByTags([CACHE_TAGS.COMPLAINTS]))
    );
  }

  deleteComplaint(id: number): Observable<ApiResponse<string>> {
    return this.delete<ApiResponse<string>>(`${this.baseUrl}/${id}`).pipe(
      tap(() => this.cacheService.invalidateByTags([CACHE_TAGS.COMPLAINTS]))
    );
  }
}