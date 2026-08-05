import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PaginationResponse } from '../../../shared/models/responses/pagination-response.model';
import { ApiResponse } from '../../../shared/models/responses/api-response.model';
import { ApiService } from '../../../shared/services/api.service';

import { CreateDonationDto } from '../models/requests/create-donation.dto';
import { DonationAdminFilterDto } from '../models/requests/donation-admin-filter.dto';
import { DonationAdminListDto } from '../models/responses/donation-admin-list.dto';
import { DonationUserListDto } from '../models/responses/donation-user-list.dto';
import { AdminDonationStatisticsDto } from '../models/responses/admin-donation-statistics.dto';
import { CreateDonationResponseDto } from '../models/responses/create-donation-responseDto';

@Injectable({
  providedIn: 'root',
})
export class DonationService extends ApiService {
  private readonly api = `${environment.apiBaseUrl}/Payment`;

  createDonation(body: CreateDonationDto): Observable<ApiResponse<CreateDonationResponseDto>> {
    return this.post<ApiResponse<CreateDonationResponseDto>>(`${this.api}/create-donation`, body);
  }

  getMyDonations(
    pageNumber: number = 1,
    pageSize: number = 10,
  ): Observable<PaginationResponse<DonationUserListDto>> {
    const params = { Page: pageNumber, PageSize: pageSize };
    return this.get<PaginationResponse<DonationUserListDto>>(`${this.api}/get-my-donations`, params);
  }

  getDonations(
    filter: DonationAdminFilterDto,
  ): Observable<PaginationResponse<DonationAdminListDto>> {
    const params: any = {
      Page: filter.pageNumber,
      PageSize: filter.pageSize,
    };

    if (filter.userEmail) {
      params.UserEmail = filter.userEmail;
    }

    if (filter.paymentStatus !== undefined && filter.paymentStatus !== null) {
      params.Status = filter.paymentStatus;
    }

    return this.get<PaginationResponse<DonationAdminListDto>>(`${this.api}/get-donations`, params);
  }

  getDonationStatistics(): Observable<ApiResponse<AdminDonationStatisticsDto>> {
    return this.get<ApiResponse<AdminDonationStatisticsDto>>(`${this.api}/admin/statistics`);
  }
}
