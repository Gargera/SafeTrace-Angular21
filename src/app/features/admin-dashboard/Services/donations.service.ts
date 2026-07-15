import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PaginationResponse } from '../../../shared/models/responses/pagination-response.model';
import { DonationAdminListDto } from '../pages/donations/models/donation-admin-list.dto';
import { DonationAdminFilterDto } from '../pages/donations/models/donation-admin-filter.dto';

@Injectable({
  providedIn: 'root',
})
export class DonationService {
  private readonly http = inject(HttpClient);

  private readonly api = `${environment.apiBaseUrl}/Payment`;

  getDonations(
    filter: DonationAdminFilterDto,
  ): Observable<PaginationResponse<DonationAdminListDto>> {
    let params = new HttpParams()
      .set('PageNumber', filter.pageNumber)
      .set('PageSize', filter.pageSize);

    // if (filter.search) {
    //   params = params.set('Search', filter.search);
    // }

    if (filter.paymentStatus !== undefined && filter.paymentStatus !== null) {
      params = params.set('PaymentStatus', filter.paymentStatus.toString());
    }

    return this.http.get<PaginationResponse<DonationAdminListDto>>(`${this.api}/get-donations`, {
      params,
    });
  }
}
