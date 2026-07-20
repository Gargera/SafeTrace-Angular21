import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../shared/models/responses/api-response.model';
import { ApiService } from '../../../shared/services/api.service';
import { ComplaintStatisticsDto } from '../models/ComplaintStatisticsDto';
import { ComplaintResponseDto, PaginationResponse } from '../models/complaint.model';
import { ComplaintFilterDto } from '../models/complaint-filter.model';
import { ResolveComplaintDto } from '../models/resolve-complaint.model';

@Injectable({ providedIn: 'root' })
export class ComplaintsService extends ApiService {
  private readonly baseUrl = `${environment.baseUrl}/api/Complaints`;

  getStatistics(): Observable<ApiResponse<ComplaintStatisticsDto>> {
    return this.get<ApiResponse<ComplaintStatisticsDto>>(`${this.baseUrl}/statistics`);
  }

  getAll(filter: ComplaintFilterDto): Observable<ApiResponse<PaginationResponse<ComplaintResponseDto>>> {
    return this.get<ApiResponse<PaginationResponse<ComplaintResponseDto>>>(
      this.baseUrl,
      filter as Record<string, any>
    );
  }

  getComplaintById(id: number): Observable<ApiResponse<ComplaintResponseDto>> {
    return this.getById<ApiResponse<ComplaintResponseDto>>(this.baseUrl, id);
  }

  createComplaint(data: { caseCode?: string; message: string }): Observable<ApiResponse<ComplaintResponseDto>> {
    return this.post<ApiResponse<ComplaintResponseDto>>(this.baseUrl, data);
  }

  resolve(id: number, dto: ResolveComplaintDto): Observable<ApiResponse<string>> {
    return this.put<ApiResponse<string>>(`${this.baseUrl}/${id}/resolve`, dto);
  }

  deleteComplaint(id: number): Observable<ApiResponse<string>> {
    return this.delete<ApiResponse<string>>(`${this.baseUrl}/${id}`);
  }
}