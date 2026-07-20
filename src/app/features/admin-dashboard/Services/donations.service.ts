import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PaginationResponse } from '../../../shared/models/responses/pagination-response.model';
import { DonationAdminListDto } from '../pages/donations/models/donation-admin-list.dto';
import { DonationAdminFilterDto } from '../pages/donations/models/donation-admin-filter.dto';
import { AdminDonationStatisticsDto } from '../pages/donations/models/admin-donation-statistics.dto';
import { ApiResponse } from '../../../shared/models/responses/api-response.model';

@Injectable({
  providedIn: 'root',
})
export class DonationService {
  private readonly http = inject(HttpClient);

  private readonly api = `${environment.apiBaseUrl}/Payment`;

  getDonations(
    filter: DonationAdminFilterDto,
  ): Observable<PaginationResponse<DonationAdminListDto>> {
    let params = new HttpParams().set('Page', filter.pageNumber).set('PageSize', filter.pageSize);

    if (filter.userEmail) {
      params = params.set('UserEmail', filter.userEmail);
    }

    if (filter.paymentStatus !== undefined && filter.paymentStatus !== null) {
      params = params.set('Status', filter.paymentStatus.toString());
    }

    return this.http.get<PaginationResponse<DonationAdminListDto>>(`${this.api}/get-donations`, {
      params,
    });
  }

  getDonationStatistics(): Observable<ApiResponse<AdminDonationStatisticsDto>> {
    return this.http.get<ApiResponse<AdminDonationStatisticsDto>>(`${this.api}/admin/statistics`);
  }
}
