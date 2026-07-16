import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../shared/services/api.service';
import { UrgentCaseListItemResponse } from '../models/response/UrgentCaseListItemResponse';
import { UrgentCaseDetailResponse } from '../models/response/UrgentCaseDetailResponse';
import { UrgentCaseCreateRequest } from '../models/request/UrgentCaseCreateRequest';
import { UrgentCaseUpdateRequest } from '../models/request/UrgentCaseUpdateRequest';
import { FoundPersonInfoRequest } from '../../../core/models/Cases.model';
import { ApiResponse } from '../../../shared/models/responses/api-response.model';
import { PaginationResponse } from '../../../shared/models/responses/pagination-response.model';
import { environment } from '../../../../environments/environment';
import { UrgentCasesFilterRequest } from '../models/request/UrgentCaseFilterRequest';

@Injectable({
  providedIn: 'root'
})
export class UrgentCaseService extends ApiService {
  private readonly baseUrl = `${environment.baseUrl}/api/UrgentCase`;

  /**
   * Get all urgent cases with filters (public)
   * GET: /api/UrgentCase/GetCases
   */
  getAllCases(filter: UrgentCasesFilterRequest): Observable<ApiResponse<PaginationResponse<UrgentCaseListItemResponse>>> {
    return this.get<ApiResponse<PaginationResponse<UrgentCaseListItemResponse>>>(
      `${this.baseUrl}/GetCases`,
      filter as Record<string, any>
    );
  }

  /**
   * Get all urgent cases with filters (admin only)
   * GET: /api/UrgentCase/Admin/GetCases
   */
  adminGetAllCases(filter: UrgentCasesFilterRequest): Observable<ApiResponse<PaginationResponse<UrgentCaseDetailResponse>>> {
    return this.get<ApiResponse<PaginationResponse<UrgentCaseDetailResponse>>>(
      `${this.baseUrl}/Admin/GetCases`,
      filter as Record<string, any>
    );
  }

  /**
   * Get urgent case by ID (public)
   * GET: /api/UrgentCase/GetCaseDetails/{id}
   */
  getCaseById(id: number): Observable<ApiResponse<UrgentCaseDetailResponse>> {
    return this.get<ApiResponse<UrgentCaseDetailResponse>>(
      `${this.baseUrl}/GetCaseDetails/${id}`
    );
  }

  /**
   * Get urgent case by ID (admin only)
   * GET: /api/UrgentCase/Admin/GetCaseDetails/{id}
   */
  adminGetCaseById(id: number): Observable<ApiResponse<UrgentCaseDetailResponse>> {
    return this.get<ApiResponse<UrgentCaseDetailResponse>>(
      `${this.baseUrl}/Admin/GetCaseDetails/${id}`
    );
  }

  /**
   * Create a new urgent case
   * POST: /api/UrgentCase/CreateCase
   * Content-Type: multipart/form-data
   */
  createCase(request: UrgentCaseCreateRequest): Observable<ApiResponse<string>> {
    const formData = this.buildFormData(request);
    return this.postFormData<ApiResponse<string>>(
      `${this.baseUrl}/CreateCase`,
      formData
    );
  }

  /**
   * Update an urgent case
   * PUT: /api/UrgentCase/UpdateCase/{id}
   * Content-Type: multipart/form-data
   */
  updateCase(id: number, request: UrgentCaseUpdateRequest): Observable<ApiResponse<string>> {
    const formData = this.buildFormData(request);
    return this.putFormData<ApiResponse<string>>(
      `${this.baseUrl}/UpdateCase/${id}`,
      formData
    );
  }

  /**
   * Soft delete an urgent case
   * DELETE: /api/UrgentCase/Delete/{id}
   */
  deleteCase(id: number): Observable<ApiResponse<string>> {
    return this.delete<ApiResponse<string>>(
      `${this.baseUrl}/Delete/${id}`
    );
  }

  /**
   * Mark an urgent case as found
   * PUT: /api/UrgentCase/{id}/mark-as-found
   */
  markAsFound(id: number, request: FoundPersonInfoRequest): Observable<ApiResponse<string>> {
    return this.put<ApiResponse<string>>(
      `${this.baseUrl}/${id}/mark-as-found`,
      request
    );
  }

  /**
   * Permanently delete an urgent case
   * DELETE: /api/UrgentCase/{id}/permanent
   */
  permanentDelete(id: number): Observable<ApiResponse<string>> {
    return this.delete<ApiResponse<string>>(
      `${this.baseUrl}/${id}/permanent`
    );
  }
}