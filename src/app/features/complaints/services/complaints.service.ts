import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../shared/models/responses/api-response.model';
import { ApiService } from '../../../shared/services/api.service';
import { ComplaintStatisticsDto } from '../models/ComplaintStatisticsDto';

@Injectable({ providedIn: 'root' })
export class ComplaintsService extends ApiService {
  private readonly baseUrl = `${environment.baseUrl}/api/Complaints`;

  getStatistics(): Observable<ApiResponse<ComplaintStatisticsDto>> {
    return this.get<ApiResponse<ComplaintStatisticsDto>>(`${this.baseUrl}/statistics`);
  }
}
