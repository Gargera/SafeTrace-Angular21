import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { PaginationResponse } from '../../../../shared/models/responses/pagination-response.model';
import { DonationUserListDto } from './models/donation-user-list.dto';

@Injectable({
  providedIn: 'root',
})
export class DonationService {
  private readonly http = inject(HttpClient);

  private readonly api = `${environment.apiBaseUrl}/Payment`;
  getMyDonations(
    pageNumber: number = 1,
    pageSize: number = 12,
  ): Observable<PaginationResponse<DonationUserListDto>> {
    const params = new HttpParams().set('Page', pageNumber).set('PageSize', pageSize);

    return this.http.get<PaginationResponse<DonationUserListDto>>(`${this.api}/get-my-donations`, {
      params,
    });
  }
}
