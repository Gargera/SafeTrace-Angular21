import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../shared/services/api.service';
import { UnknownCaseFilterRequest } from '../models/request/UnknownCaseFilterRequest';
import { UnknownCaseListItemResponse } from '../models/response/UnknownCaseListItemResponse';
import { UnknownCaseDetailResponse } from '../models/response/UnknownCaseDetailResponse';
import { UnknownCaseUpdateRequest } from '../models/request/UnknownCaseUpdateRequest';
import { UnknownCaseCreateRequest } from '../models/request/UnknownCaseCreateRequest';
import { FoundPersonInfoRequest } from '../../../core/models/Cases.model';
import { ApiResponse } from '../../../shared/models/responses/api-response.model';
import { PaginationResponse } from '../../../shared/models/responses/pagination-response.model';
import { CreateCaseResponse } from '../../../shared/models/responses/create-case-response.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class UnknownCaseService extends ApiService {
  private readonly baseUrl = `${environment.baseUrl}/api/UnknownCase`;

  /**
   * Get all unknown cases with filters (public)
   * GET: /api/UnknownCase/GetCases
   */
  getAllCases(
    filter: UnknownCaseFilterRequest,
  ): Observable<ApiResponse<PaginationResponse<UnknownCaseListItemResponse>>> {
    return this.get<ApiResponse<PaginationResponse<UnknownCaseListItemResponse>>>(
      `${this.baseUrl}/GetCases`,
      (filter as unknown) as Record<string, unknown>,
    );
  }

  /**
   * Get all unknown cases with filters (admin only)
   * GET: /api/UnknownCase/Admin/GetCases
   */
  adminGetAllCases(
    filter: UnknownCaseFilterRequest,
  ): Observable<ApiResponse<PaginationResponse<UnknownCaseDetailResponse>>> {
    return this.get<ApiResponse<PaginationResponse<UnknownCaseDetailResponse>>>(
      `${this.baseUrl}/Admin/GetCases`,
      (filter as unknown) as Record<string, unknown>,
    );
  }

  /**
   * Get unknown case by ID (public)
   * GET: /api/UnknownCase/GetCaseDetails/{id}
   */
  getCaseById(id: number): Observable<ApiResponse<UnknownCaseDetailResponse>> {
    return this.get<ApiResponse<UnknownCaseDetailResponse>>(`${this.baseUrl}/GetCaseDetails/${id}`);
  }

  /**
   * Get unknown case by ID (admin only)
   * GET: /api/UnknownCase/Admin/GetCaseDetails/{id}
   */
  adminGetCaseById(id: number): Observable<ApiResponse<UnknownCaseDetailResponse>> {
    return this.get<ApiResponse<UnknownCaseDetailResponse>>(
      `${this.baseUrl}/Admin/GetCaseDetails/${id}`,
    );
  }

  /**
   * Create a new unknown case
   * POST: /api/UnknownCase/CreateCase?forceCreate=false
   * Content-Type: multipart/form-data
   *
   * Backend controller for Unknown doesn't implement the duplicate-check yet
   * (per project notes), but the frontend already sends forceCreate and reads
   * isCreated/matchedCases so nothing else needs to change here once it's added.
   */
  createCase(
    request: UnknownCaseCreateRequest,
    forceCreate = false,
  ): Observable<ApiResponse<CreateCaseResponse>> {
    const formData = this.buildFormData(request);
    return this.postFormData<ApiResponse<CreateCaseResponse>>(
      `${this.baseUrl}/CreateCase`,
      formData,
      {
        forceCreate,
      },
    );
  }

  /**
   * Update an unknown case
   * PUT: /api/UnknownCase/UpdateCase/{id}
   * Content-Type: multipart/form-data
   */
  updateCase(id: number, request: UnknownCaseUpdateRequest): Observable<ApiResponse<string>> {
    const formData = this.buildFormData(request);
    return this.putFormData<ApiResponse<string>>(`${this.baseUrl}/UpdateCase/${id}`, formData);
  }

  /**
   * Approve an unknown case
   * PUT: /api/UnknownCase/Approve/{id}
   */
  approveCase(id: number): Observable<ApiResponse<string>> {
    return this.put<ApiResponse<string>>(`${this.baseUrl}/Approve/${id}`, {});
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
    );
  }

  /**
   * Soft delete an unknown case
   * DELETE: /api/UnknownCase/Delete/{id}
   */
  deleteCase(id: number): Observable<ApiResponse<string>> {
    return this.delete<ApiResponse<string>>(`${this.baseUrl}/Delete/${id}`);
  }

  /**
   * Mark an unknown case as found
   * PUT: /api/UnknownCase/MarkAsFound/{id}
   */
  markAsFound(id: number, request: FoundPersonInfoRequest): Observable<ApiResponse<string>> {
    return this.put<ApiResponse<string>>(`${this.baseUrl}/MarkAsFound/${id}`, request);
  }

  /**
   * Permanently delete an unknown case
   * DELETE: /api/UnknownCase/PermanentDeletion/{id}
   */
  permanentDelete(id: number): Observable<ApiResponse<string>> {
    return this.delete<ApiResponse<string>>(`${this.baseUrl}/PermanentDeletion/${id}`);
  }
}
