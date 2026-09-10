import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiService } from '../../../shared/services/api.service';
import { LongTermCaseListItemResponse } from '../models/response/LongTermCaseListItemResponse';
import { LongTermCaseDetailResponse } from '../models/response/LongTermCaseDetailResponse';
import { LongTermCreateCaseResponse } from '../models/response/LongTermCreateCaseResponse';
import { LongTermCaseCreateRequest } from '../models/request/LongTermCaseCreateRequest';
import { LongTermCaseUpdateRequest } from '../models/request/LongTermCaseUpdateRequest';
import { FoundPersonInfoRequest } from '../../../core/models/cases.model';
import { environment } from '../../../../environments/environment';
import { LongTermCaseFilterRequest } from '../models/request/LongTermCaseFilterRequest';
import { ApiResponse } from '../../../shared/models/api-response.model';
import { PaginationResponse } from '../../../shared/models/pagination-response.model';
import { CaseSubmissionResponse } from '../../../shared/helper/cases-helper/case-submission-flow.helper';
import { DuplicateDecisionPayload } from '../../../shared/helper/cases-helper/case-duplicate.helper';
import { map } from 'rxjs/operators';
import { CacheService } from '../../../core/cache/cache.service';
import { CACHE_TAGS, CACHE_TTL } from '../../../core/cache/cache.constants';

@Injectable({
  providedIn: 'root',
})
export class LongTermCaseService extends ApiService {
  private readonly baseUrl = `${environment.baseUrl}/api/LongTermCase`;
  private readonly cacheService = inject(CacheService);

  /**
   * Get all long-term cases with filters (public)
   * GET: /api/LongTermCase/GetCases
   */
  getAllCases(
    filter: LongTermCaseFilterRequest,
  ): Observable<ApiResponse<PaginationResponse<LongTermCaseListItemResponse>>> {
    const key = `LongTermCase_getAllCases_${JSON.stringify(filter)}`;
    return this.cacheService.getOrSet(
      key,
      () => this.get<ApiResponse<PaginationResponse<LongTermCaseListItemResponse>>>(
        `${this.baseUrl}/GetCases`,
        filter,
      ),
      CACHE_TTL.LIST,
      [CACHE_TAGS.LONG_TERM_CASES]
    );
  }

  /**
   * Get all long-term cases with filters (admin only)
   * GET: /api/LongTermCase/Admin/GetCases
   */
  adminGetAllCases(
    filter: LongTermCaseFilterRequest,
  ): Observable<ApiResponse<PaginationResponse<LongTermCaseDetailResponse>>> {
    const key = `LongTermCase_adminGetAllCases_${JSON.stringify(filter)}`;
    return this.cacheService.getOrSet(
      key,
      () => this.get<ApiResponse<PaginationResponse<LongTermCaseDetailResponse>>>(
        `${this.baseUrl}/Admin/GetCases`,
        filter,
      ),
      CACHE_TTL.LIST,
      [CACHE_TAGS.LONG_TERM_CASES]
    );
  }

  /**
   * Get long-term case by ID (public)
   * GET: /api/LongTermCase/GetCaseDetails/{id}
   */
  getCaseById(id: number): Observable<ApiResponse<LongTermCaseDetailResponse>> {
    const key = `LongTermCase_getCaseById_${id}`;
    return this.cacheService.getOrSet(
      key,
      () => this.get<ApiResponse<LongTermCaseDetailResponse>>(
        `${this.baseUrl}/GetCaseDetails/${id}`,
      ),
      CACHE_TTL.DETAILS,
      [CACHE_TAGS.LONG_TERM_CASES]
    );
  }

  /**
   * Get long-term case by ID (admin only)
   * GET: /api/LongTermCase/Admin/GetCaseDetails/{id}
   */
  adminGetCaseById(id: number): Observable<ApiResponse<LongTermCaseDetailResponse>> {
    const key = `LongTermCase_adminGetCaseById_${id}`;
    return this.cacheService.getOrSet(
      key,
      () => this.get<ApiResponse<LongTermCaseDetailResponse>>(
        `${this.baseUrl}/Admin/GetCaseDetails/${id}`,
      ),
      CACHE_TTL.DETAILS,
      [CACHE_TAGS.LONG_TERM_CASES]
    );
  }

  /**
   * Create a new long-term case
   * POST: /api/LongTermCase/CreateCase?forceCreate=false
   * Content-Type: multipart/form-data
   */
  createCase(
    request: LongTermCaseCreateRequest,
    forceCreate = false,
  ): Observable<CaseSubmissionResponse<DuplicateDecisionPayload>> {
    const formData = this.buildFormData(request);
    return this.postFormData<ApiResponse<LongTermCreateCaseResponse>>(
      `${this.baseUrl}/CreateCase`,
      formData,
      { forceCreate },
    ).pipe(
      tap(() => this.cacheService.invalidateByTags([CACHE_TAGS.LONG_TERM_CASES, CACHE_TAGS.PROFILE, CACHE_TAGS.DASHBOARD])),
      map(response => ({
        success: response.success,
        message: response.message,
        data: response.data as unknown as DuplicateDecisionPayload
      }))
    );
  }

  /**
   * Update a long-term case
   * PUT: /api/LongTermCase/UpdateCase/{id}
   * Content-Type: multipart/form-data
   */
  updateCase(id: number, request: LongTermCaseUpdateRequest): Observable<ApiResponse<string>> {
    const formData = this.buildFormData(request);
    return this.putFormData<ApiResponse<string>>(`${this.baseUrl}/UpdateCase/${id}`, formData).pipe(
      tap(() => this.cacheService.invalidateByTags([CACHE_TAGS.LONG_TERM_CASES, CACHE_TAGS.PROFILE, CACHE_TAGS.DASHBOARD]))
    );
  }

  /**
   * Approve a long-term case
   * PUT: /api/LongTermCase/Approve/{id}
   */
  approveCase(id: number): Observable<ApiResponse<string>> {
    return this.put<ApiResponse<string>>(`${this.baseUrl}/Approve/${id}`, {}).pipe(
      tap(() => this.cacheService.invalidateByTags([CACHE_TAGS.LONG_TERM_CASES, CACHE_TAGS.PROFILE, CACHE_TAGS.DASHBOARD]))
    );
  }

  /**
   * Reject a long-term case
   * PUT: /api/LongTermCase/Reject/{id}
   */
  rejectCase(id: number, rejectionReason: string): Observable<ApiResponse<string>> {
    return this.put<ApiResponse<string>>(
      `${this.baseUrl}/Reject/${id}`,
      JSON.stringify(rejectionReason),
      { headers: { 'Content-Type': 'application/json' } },
    ).pipe(
      tap(() => this.cacheService.invalidateByTags([CACHE_TAGS.LONG_TERM_CASES, CACHE_TAGS.PROFILE, CACHE_TAGS.DASHBOARD]))
    );
  }

  /**
   * Soft delete a long-term case
   * DELETE: /api/LongTermCase/Delete/{id}
   */
  deleteCase(id: number): Observable<ApiResponse<string>> {
    return this.delete<ApiResponse<string>>(`${this.baseUrl}/Delete/${id}`).pipe(
      tap(() => this.cacheService.invalidateByTags([CACHE_TAGS.LONG_TERM_CASES, CACHE_TAGS.PROFILE, CACHE_TAGS.DASHBOARD]))
    );
  }

  /**
   * Mark a long-term case as found
   * PUT: /api/LongTermCase/MarkAsFound/{id}
   */
  markAsFound(id: number, request: FoundPersonInfoRequest): Observable<ApiResponse<string>> {
    return this.put<ApiResponse<string>>(`${this.baseUrl}/MarkAsFound/${id}`, request).pipe(
      tap(() => this.cacheService.invalidateByTags([CACHE_TAGS.LONG_TERM_CASES, CACHE_TAGS.PROFILE, CACHE_TAGS.DASHBOARD]))
    );
  }

  /**
   * Permanently delete a long-term case
   * DELETE: /api/LongTermCase/PermanentDeletion/{id}
   */
  permanentDelete(id: number): Observable<ApiResponse<string>> {
    return this.delete<ApiResponse<string>>(`${this.baseUrl}/PermanentDeletion/${id}`).pipe(
      tap(() => this.cacheService.invalidateByTags([CACHE_TAGS.LONG_TERM_CASES, CACHE_TAGS.PROFILE, CACHE_TAGS.DASHBOARD]))
    );
  }

  getMyCaseById(id: number) {
    const key = `LongTermCase_getMyCaseById_${id}`;
    return this.cacheService.getOrSet(
      key,
      () => this.http.get<ApiResponse<LongTermCaseDetailResponse>>(
        `${environment.baseUrl}/api/LongTermCase/MyCaseDetails/${id}`
      ),
      CACHE_TTL.DETAILS,
      [CACHE_TAGS.LONG_TERM_CASES]
    );
  }
}
