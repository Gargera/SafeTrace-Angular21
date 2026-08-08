import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiService } from '../../../shared/services/api.service';
import { UnknownCaseFilterRequest } from '../models/request/UnknownCaseFilterRequest';
import { UnknownCaseListItemResponse } from '../models/response/UnknownCaseListItemResponse';
import { UnknownCaseDetailResponse } from '../models/response/UnknownCaseDetailResponse';
import { UnknownCreateCaseResponse } from '../models/response/UnknownCreateCaseResponse';
import { UnknownCaseUpdateRequest } from '../models/request/UnknownCaseUpdateRequest';
import { UnknownCaseCreateRequest } from '../models/request/UnknownCaseCreateRequest';
import { FoundPersonInfoRequest } from '../../../core/models/cases.model';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../shared/models/responses/api-response.model';
import { PaginationResponse } from '../../../shared/models/responses/pagination-response.model';
import { CacheService } from '../../../core/cache/cache.service';
import { CACHE_TAGS, CACHE_TTL } from '../../../core/cache/cache.constants';

@Injectable({
  providedIn: 'root',
})
export class UnknownCaseService extends ApiService {
  private readonly baseUrl = `${environment.baseUrl}/api/UnknownCase`;
  private readonly cacheService = inject(CacheService);

  /**
   * Get all unknown cases with filters (public)
   * GET: /api/UnknownCase/GetCases
   */
  getAllCases(
    filter: UnknownCaseFilterRequest,
  ): Observable<ApiResponse<PaginationResponse<UnknownCaseListItemResponse>>> {
    const key = `UnknownCase_getAllCases_${JSON.stringify(filter)}`;
    return this.cacheService.getOrSet(
      key,
      () => this.get<ApiResponse<PaginationResponse<UnknownCaseListItemResponse>>>(
        `${this.baseUrl}/GetCases`,
        filter,
      ),
      CACHE_TTL.LIST,
      [CACHE_TAGS.UNKNOWN_CASES]
    );
  }

  /**
   * Get all unknown cases with filters (admin only)
   * GET: /api/UnknownCase/Admin/GetCases
   */
  adminGetAllCases(
    filter: UnknownCaseFilterRequest,
  ): Observable<ApiResponse<PaginationResponse<UnknownCaseDetailResponse>>> {
    const key = `UnknownCase_adminGetAllCases_${JSON.stringify(filter)}`;
    return this.cacheService.getOrSet(
      key,
      () => this.get<ApiResponse<PaginationResponse<UnknownCaseDetailResponse>>>(
        `${this.baseUrl}/Admin/GetCases`,
        filter,
      ),
      CACHE_TTL.LIST,
      [CACHE_TAGS.UNKNOWN_CASES]
    );
  }

  /**
   * Get unknown case by ID (public)
   * GET: /api/UnknownCase/GetCaseDetails/{id}
   */
  getCaseById(id: number): Observable<ApiResponse<UnknownCaseDetailResponse>> {
    const key = `UnknownCase_getCaseById_${id}`;
    return this.cacheService.getOrSet(
      key,
      () => this.get<ApiResponse<UnknownCaseDetailResponse>>(`${this.baseUrl}/GetCaseDetails/${id}`),
      CACHE_TTL.DETAILS,
      [CACHE_TAGS.UNKNOWN_CASES]
    );
  }

  /**
   * Get unknown case by ID (admin only)
   * GET: /api/UnknownCase/Admin/GetCaseDetails/{id}
   */
  adminGetCaseById(id: number): Observable<ApiResponse<UnknownCaseDetailResponse>> {
    const key = `UnknownCase_adminGetCaseById_${id}`;
    return this.cacheService.getOrSet(
      key,
      () => this.get<ApiResponse<UnknownCaseDetailResponse>>(
        `${this.baseUrl}/Admin/GetCaseDetails/${id}`,
      ),
      CACHE_TTL.DETAILS,
      [CACHE_TAGS.UNKNOWN_CASES]
    );
  }

  /**
   * Create a new unknown case
   * POST: /api/UnknownCase/CreateCase?forceCreate=false
   * Content-Type: multipart/form-data
   */
  createCase(
    request: UnknownCaseCreateRequest,
    forceCreate = false,
  ): Observable<ApiResponse<UnknownCreateCaseResponse>> {
    const formData = this.buildFormData(request);
    return this.postFormData<ApiResponse<UnknownCreateCaseResponse>>(
      `${this.baseUrl}/CreateCase`,
      formData,
      { forceCreate },
    ).pipe(
      tap(() => this.cacheService.invalidateByTags([CACHE_TAGS.UNKNOWN_CASES, CACHE_TAGS.PROFILE, CACHE_TAGS.DASHBOARD]))
    );
  }

  /**
   * Update an unknown case
   * PUT: /api/UnknownCase/UpdateCase/{id}
   * Content-Type: multipart/form-data
   */
  updateCase(id: number, request: UnknownCaseUpdateRequest): Observable<ApiResponse<string>> {
    const formData = this.buildFormData(request);
    return this.putFormData<ApiResponse<string>>(`${this.baseUrl}/UpdateCase/${id}`, formData).pipe(
      tap(() => this.cacheService.invalidateByTags([CACHE_TAGS.UNKNOWN_CASES, CACHE_TAGS.PROFILE, CACHE_TAGS.DASHBOARD]))
    );
  }

  /**
   * Approve an unknown case
   * PUT: /api/UnknownCase/Approve/{id}
   */
  approveCase(id: number): Observable<ApiResponse<string>> {
    return this.put<ApiResponse<string>>(`${this.baseUrl}/Approve/${id}`, {}).pipe(
      tap(() => this.cacheService.invalidateByTags([CACHE_TAGS.UNKNOWN_CASES, CACHE_TAGS.PROFILE, CACHE_TAGS.DASHBOARD]))
    );
  }

  /**
   * Reject an unknown case
   * PUT: /api/UnknownCase/Reject/{id}
   */
  rejectCase(id: number, rejectionReason: string): Observable<ApiResponse<string>> {
    return this.put<ApiResponse<string>>(
      `${this.baseUrl}/Reject/${id}`,
      JSON.stringify(rejectionReason),
      { headers: { 'Content-Type': 'application/json' } },
    ).pipe(
      tap(() => this.cacheService.invalidateByTags([CACHE_TAGS.UNKNOWN_CASES, CACHE_TAGS.PROFILE, CACHE_TAGS.DASHBOARD]))
    );
  }

  /**
   * Soft delete an unknown case
   * DELETE: /api/UnknownCase/Delete/{id}
   */
  deleteCase(id: number): Observable<ApiResponse<string>> {
    return this.delete<ApiResponse<string>>(`${this.baseUrl}/Delete/${id}`).pipe(
      tap(() => this.cacheService.invalidateByTags([CACHE_TAGS.UNKNOWN_CASES, CACHE_TAGS.PROFILE, CACHE_TAGS.DASHBOARD]))
    );
  }

  /**
   * Mark an unknown case as found
   * PUT: /api/UnknownCase/MarkAsFound/{id}
   */
  markAsFound(id: number, request: FoundPersonInfoRequest): Observable<ApiResponse<string>> {
    return this.put<ApiResponse<string>>(`${this.baseUrl}/MarkAsFound/${id}`, request).pipe(
      tap(() => this.cacheService.invalidateByTags([CACHE_TAGS.UNKNOWN_CASES, CACHE_TAGS.PROFILE, CACHE_TAGS.DASHBOARD]))
    );
  }

  /**
   * Permanently delete an unknown case
   * DELETE: /api/UnknownCase/PermanentDeletion/{id}
   */
  permanentDelete(id: number): Observable<ApiResponse<string>> {
    return this.delete<ApiResponse<string>>(`${this.baseUrl}/PermanentDeletion/${id}`).pipe(
      tap(() => this.cacheService.invalidateByTags([CACHE_TAGS.UNKNOWN_CASES, CACHE_TAGS.PROFILE, CACHE_TAGS.DASHBOARD]))
    );
  }

  getMyCaseById(id: number) {
    const key = `UnknownCase_getMyCaseById_${id}`;
    return this.cacheService.getOrSet(
      key,
      () => this.http.get<ApiResponse<UnknownCaseDetailResponse>>(
        `${environment.baseUrl}/api/UnknownCase/MyCaseDetails/${id}`
      ),
      CACHE_TTL.DETAILS,
      [CACHE_TAGS.UNKNOWN_CASES]
    );
  }
}
