import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../shared/services/api.service';
import { LongTermCaseListItemResponse } from '../models/response/LongTermCaseListItemResponse';
import { LongTermCaseDetailResponse } from '../models/response/LongTermCaseDetailResponse';
import { LongTermCaseFilterRequest } from '../models/request/LongTermCaseFilterRequest';
import { LongTermCaseCreateRequest } from '../models/request/LongTermCaseCreateRequest';
import { LongTermCaseUpdateRequest } from '../models/request/LongTermCaseUpdateRequest';
import { FoundPersonInfoRequest } from '../../../core/models/Cases.model';
import { ApiResponse } from '../../../shared/models/responses/api-response.model';
import { PaginationResponse } from '../../../shared/models/responses/pagination-response.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})

export class LongTermCaseService extends ApiService {
    private readonly baseUrl = `${environment.baseUrl}/api/LongTermCase`;

    /**
     * Get all long-term cases with filters (public)
     * GET: /api/LongTermCase/GetCases
     */
    getAllCases(filter: LongTermCaseFilterRequest): Observable<ApiResponse<PaginationResponse<LongTermCaseListItemResponse>>> {
        return this.get<ApiResponse<PaginationResponse<LongTermCaseListItemResponse>>>(
        `${this.baseUrl}/GetCases`,
        filter as Record<string, any>
        );
    }

    /**
     * Get all long-term cases with filters (admin only)
     * GET: /api/LongTermCase/Admin/GetCases
     */
    adminGetAllCases(filter: LongTermCaseFilterRequest): Observable<ApiResponse<PaginationResponse<LongTermCaseDetailResponse>>> {
        return this.get<ApiResponse<PaginationResponse<LongTermCaseDetailResponse>>>(
        `${this.baseUrl}/Admin/GetCases`,
        filter as Record<string, any>
        );
    }

    /**
     * Get current user's long-term cases
     * GET: /api/LongTermCase/GetMyCases
     */
    getMyCases(filter: LongTermCaseFilterRequest): Observable<ApiResponse<PaginationResponse<LongTermCaseListItemResponse>>> {
        return this.get<ApiResponse<PaginationResponse<LongTermCaseListItemResponse>>>(
        `${this.baseUrl}/GetMyCases`,
        filter as Record<string, any>
        );
    }

    /**
     * Get long-term case by ID (public)
     * GET: /api/LongTermCase/GetCaseDetails/{id}
     */
    getCaseById(id: number): Observable<ApiResponse<LongTermCaseDetailResponse>> {
        return this.get<ApiResponse<LongTermCaseDetailResponse>>(
        `${this.baseUrl}/GetCaseDetails/${id}`
        );
    }

    /**
     * Get long-term case by ID (admin only)
     * GET: /api/LongTermCase/Admin/GetCaseDetails/{id}
     */
    adminGetCaseById(id: number): Observable<ApiResponse<LongTermCaseDetailResponse>> {
        return this.get<ApiResponse<LongTermCaseDetailResponse>>(
        `${this.baseUrl}/Admin/GetCaseDetails/${id}`
        );
    }

    /**
     * Create a new long-term case
     * POST: /api/LongTermCase/CreateCase?forceCreate={boolean}
     * Content-Type: multipart/form-data
     * @param request - Case data
     * @param forceCreate - If true, bypass duplicate check
     */
    createCase(request: LongTermCaseCreateRequest, forceCreate: boolean = false): Observable<ApiResponse<string>> {
        const formData = this.buildFormData(request);
        return this.postFormData<ApiResponse<string>>(
        `${this.baseUrl}/CreateCase?forceCreate=${forceCreate}`,
        formData
        );
    }

    /**
     * Update a long-term case
     * PUT: /api/LongTermCase/UpdateCase/{id}
     * Content-Type: multipart/form-data
     */
    updateCase(id: number, request: LongTermCaseUpdateRequest): Observable<ApiResponse<string>> {
        const formData = this.buildFormData(request);
        return this.putFormData<ApiResponse<string>>(
        `${this.baseUrl}/UpdateCase/${id}`,
        formData
        );
    }

    /**
     * Approve a long-term case
     * PUT: /api/LongTermCase/Approve/{id}
     */
    approveCase(id: number): Observable<ApiResponse<string>> {
        return this.put<ApiResponse<string>>(
        `${this.baseUrl}/Approve/${id}`,
        {}
        );
    }

    /**
     * Reject a long-term case
     * PUT: /api/LongTermCase/Reject/{id}
     */
    rejectCase(id: number): Observable<ApiResponse<string>> {
        return this.put<ApiResponse<string>>(
        `${this.baseUrl}/Reject/${id}`,
        {}
        );
    }

    /**
     * Soft delete a long-term case
     * DELETE: /api/LongTermCase/Delete/{id}
     */
    deleteCase(id: number): Observable<ApiResponse<string>> {
        return this.delete<ApiResponse<string>>(
        `${this.baseUrl}/Delete/${id}`
        );
    }

    /**
     * Mark a long-term case as found
     * PUT: /api/LongTermCase/MarkAsFound/{id}
     */
    markAsFound(id: number, request: FoundPersonInfoRequest): Observable<ApiResponse<string>> {
        return this.put<ApiResponse<string>>(
        `${this.baseUrl}/MarkAsFound/${id}`,
        request
        );
    }

    /**
     * Permanently delete a long-term case
     * DELETE: /api/LongTermCase/PermanentDeletion/{id}
     */
    permanentDelete(id: number): Observable<ApiResponse<string>> {
        return this.delete<ApiResponse<string>>(
        `${this.baseUrl}/PermanentDeletion/${id}`
        );
    }
}