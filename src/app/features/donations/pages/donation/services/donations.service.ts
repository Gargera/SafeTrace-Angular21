import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../../../environments/environment';
import { CreateDonationDto } from '../../../models/create-donation.dto';
import { ApiResponse } from '../../../../../shared/models/responses/api-response.model';
import { CreateDonationResponseDto } from '../../../models/create-donation-responseDto';

@Injectable({
  providedIn: 'root',
})
export class DonationService {
  private http = inject(HttpClient);

  private readonly api = `${environment.apiBaseUrl}/Payment/create-donation`;

  createDonation(body: CreateDonationDto): Observable<ApiResponse<CreateDonationResponseDto>> {
    return this.http.post<ApiResponse<CreateDonationResponseDto>>(this.api, body);
  }
}
