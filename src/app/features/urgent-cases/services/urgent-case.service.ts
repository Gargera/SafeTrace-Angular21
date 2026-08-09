import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiService } from '../../../shared/services/api.service';
import { UrgentCaseListItemResponse } from '../models/response/UrgentCaseListItemResponse';
import { UrgentCaseDetailResponse } from '../models/response/UrgentCaseDetailResponse';
import { UrgentCreateCaseResponse } from '../models/response/UrgentCreateCaseResponse';
import { UrgentCaseCreateRequest } from '../models/request/UrgentCaseCreateRequest';
import { UrgentCaseUpdateRequest } from '../models/request/UrgentCaseUpdateRequest';
import { FoundPersonInfoRequest } from '../../../core/models/cases.model';
import { environment } from '../../../../environments/environment';
import { UrgentCasesFilterRequest } from '../models/request/UrgentCaseFilterRequest';
import { UrgentCreationStatusResponse } from '../models/response/UrgentCreationStatusResponse';
import { ApiResponse } from '../../../shared/models/responses/api-response.model';
import { PaginationResponse } from '../../../shared/models/responses/pagination-response.model';
import { CacheService } from '../../../core/cache/cache.service';
import { CACHE_TAGS, CACHE_TTL } from '../../../core/cache/cache.constants';

@Injectable({
  providedIn: 'root',
})
export class UrgentCaseService extends ApiService {
  private readonly baseUrl = `${environment.baseUrl}/api/UrgentCase`;
  private readonly cacheService = inject(CacheService);

  /**
   * Get urgent creation status / cooldown
   * GET: /api/UrgentCase/CreationStatus
   */
  getCreationStatus(): Observable<ApiResponse<UrgentCreationStatusResponse>> {
    return this.get<ApiResponse<UrgentCreationStatusResponse>>(`${this.baseUrl}/CreationStatus`);
  }

  /**
   * Get all urgent cases with filters (public)
   * GET: /api/UrgentCase/GetCases
   */
  getAllCases(
    filter: UrgentCasesFilterRequest,
  ): Observable<ApiResponse<PaginationResponse<UrgentCaseListItemResponse>>> {
    const key = `UrgentCase_getAllCases_${JSON.stringify(filter)}`;
    return this.cacheService.getOrSet(
      key,
      () => this.get<ApiResponse<PaginationResponse<UrgentCaseListItemResponse>>>(
        `${this.baseUrl}/GetCases`,
        filter,
      ),
      CACHE_TTL.LIST,
      [CACHE_TAGS.URGENT_CASES]
    );
  }

  /**
   * Get all urgent cases with filters (admin only)
   * GET: /api/UrgentCase/Admin/GetCases
   */
  adminGetAllCases(
    filter: UrgentCasesFilterRequest,
  ): Observable<ApiResponse<PaginationResponse<UrgentCaseDetailResponse>>> {
    const key = `UrgentCase_adminGetAllCases_${JSON.stringify(filter)}`;
    return this.cacheService.getOrSet(
      key,
      () => this.get<ApiResponse<PaginationResponse<UrgentCaseDetailResponse>>>(
        `${this.baseUrl}/Admin/GetCases`,
        filter,
      ),
      CACHE_TTL.LIST,
      [CACHE_TAGS.URGENT_CASES]
    );
  }

  /**
   * Get urgent case by ID (public)
   * GET: /api/UrgentCase/GetCaseDetails/{id}
   */
  getCaseById(id: number): Observable<ApiResponse<UrgentCaseDetailResponse>> {
    const key = `UrgentCase_getCaseById_${id}`;
    return this.cacheService.getOrSet(
      key,
      () => this.get<ApiResponse<UrgentCaseDetailResponse>>(`${this.baseUrl}/GetCaseDetails/${id}`),
      CACHE_TTL.DETAILS,
      [CACHE_TAGS.URGENT_CASES]
    );
  }

  /**
   * Get urgent case by ID (admin only)
   * GET: /api/UrgentCase/Admin/GetCaseDetails/{id}
   */
  adminGetCaseById(id: number): Observable<ApiResponse<UrgentCaseDetailResponse>> {
    const key = `UrgentCase_adminGetCaseById_${id}`;
    return this.cacheService.getOrSet(
      key,
      () => this.get<ApiResponse<UrgentCaseDetailResponse>>(
        `${this.baseUrl}/Admin/GetCaseDetails/${id}`,
      ),
      CACHE_TTL.DETAILS,
      [CACHE_TAGS.URGENT_CASES]
    );
  }

  /**
   * Create a new urgent case
   * POST: /api/UrgentCase/CreateCase?forceCreate=false
   * Content-Type: multipart/form-data
   */
  createCase(
    request: UrgentCaseCreateRequest,
    forceCreate = false,
  ): Observable<ApiResponse<UrgentCreateCaseResponse>> {
    const formData = this.buildFormData(request);
    return this.postFormData<ApiResponse<UrgentCreateCaseResponse>>(
      `${this.baseUrl}/CreateCase`,
      formData,
      { forceCreate },
    ).pipe(
      tap(() => this.cacheService.invalidateByTags([CACHE_TAGS.URGENT_CASES, CACHE_TAGS.PROFILE, CACHE_TAGS.DASHBOARD]))
    );
  }

  /**
   * Update an urgent case
   * PUT: /api/UrgentCase/UpdateCase/{id}
   * Content-Type: multipart/form-data
   */
  updateCase(id: number, request: UrgentCaseUpdateRequest): Observable<ApiResponse<string>> {
    const formData = this.buildFormData(request);
    return this.putFormData<ApiResponse<string>>(`${this.baseUrl}/UpdateCase/${id}`, formData).pipe(
      tap(() => this.cacheService.invalidateByTags([CACHE_TAGS.URGENT_CASES, CACHE_TAGS.PROFILE, CACHE_TAGS.DASHBOARD]))
    );
  }

  /**
   * Soft delete an urgent case
   * DELETE: /api/UrgentCase/Delete/{id}
   */
  deleteCase(id: number): Observable<ApiResponse<string>> {
    return this.delete<ApiResponse<string>>(`${this.baseUrl}/Delete/${id}`).pipe(
      tap(() => this.cacheService.invalidateByTags([CACHE_TAGS.URGENT_CASES, CACHE_TAGS.PROFILE, CACHE_TAGS.DASHBOARD]))
    );
  }

  /**
   * Mark an urgent case as found
   * PUT: /api/UrgentCase/{id}/mark-as-found
   */
  markAsFound(id: number, request: FoundPersonInfoRequest): Observable<ApiResponse<string>> {
    return this.put<ApiResponse<string>>(`${this.baseUrl}/${id}/mark-as-found`, request).pipe(
      tap(() => this.cacheService.invalidateByTags([CACHE_TAGS.URGENT_CASES, CACHE_TAGS.PROFILE, CACHE_TAGS.DASHBOARD]))
    );
  }

  /**
   * Permanently delete an urgent case
   * DELETE: /api/UrgentCase/{id}/permanent
   */
  permanentDelete(id: number): Observable<ApiResponse<string>> {
    return this.delete<ApiResponse<string>>(`${this.baseUrl}/${id}/permanent`).pipe(
      tap(() => this.cacheService.invalidateByTags([CACHE_TAGS.URGENT_CASES, CACHE_TAGS.PROFILE, CACHE_TAGS.DASHBOARD]))
    );
  }

  getMyCaseById(id: number) {
    const key = `UrgentCase_getMyCaseById_${id}`;
    return this.cacheService.getOrSet(
      key,
      () => this.http.get<ApiResponse<UrgentCaseDetailResponse>>(
        `${environment.baseUrl}/api/UrgentCase/MyCaseDetails/${id}`
      ),
      CACHE_TTL.DETAILS,
      [CACHE_TAGS.URGENT_CASES]
    );
  }
}
