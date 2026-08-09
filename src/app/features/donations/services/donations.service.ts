import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
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
import { CacheService } from '../../../core/cache/cache.service';
import { CACHE_TAGS, CACHE_TTL } from '../../../core/cache/cache.constants';

@Injectable({
  providedIn: 'root',
})
export class DonationService extends ApiService {
  private readonly api = `${environment.apiBaseUrl}/Payment`;
  private readonly cacheService = inject(CacheService);

  createDonation(body: CreateDonationDto): Observable<ApiResponse<CreateDonationResponseDto>> {
    return this.post<ApiResponse<CreateDonationResponseDto>>(`${this.api}/create-donation`, body).pipe(
      tap(() => this.cacheService.invalidateByTags([CACHE_TAGS.DONATIONS]))
    );
  }

  getMyDonations(
    pageNumber: number = 1,
    pageSize: number = 10,
  ): Observable<PaginationResponse<DonationUserListDto>> {
    const params = { Page: pageNumber, PageSize: pageSize };
    const key = `Donations_getMyDonations_${pageNumber}_${pageSize}`;
    return this.cacheService.getOrSet(
      key,
      () => this.get<PaginationResponse<DonationUserListDto>>(`${this.api}/get-my-donations`, params),
      CACHE_TTL.LIST,
      [CACHE_TAGS.DONATIONS]
    );
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

    const key = `Donations_getDonations_${JSON.stringify(params)}`;
    return this.cacheService.getOrSet(
      key,
      () => this.get<PaginationResponse<DonationAdminListDto>>(`${this.api}/get-donations`, params),
      CACHE_TTL.LIST,
      [CACHE_TAGS.DONATIONS]
    );
  }

  getDonationStatistics(): Observable<ApiResponse<AdminDonationStatisticsDto>> {
    const key = `Donations_getDonationStatistics`;
    return this.cacheService.getOrSet(
      key,
      () => this.get<ApiResponse<AdminDonationStatisticsDto>>(`${this.api}/admin/statistics`),
      CACHE_TTL.LIST,
      [CACHE_TAGS.DONATIONS]
    );
  }
}
