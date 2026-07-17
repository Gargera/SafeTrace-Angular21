import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  AddIdImageDTO,
  ChangePasswordDTO,
  GetUserInfoDTO,
  MyCaseListItemResponse,
  MyCasesFilterRequest,
  UpdateHomeLocationDTO,
  UpdateNameDTO,
  UpdateProfileImageDTO,
} from '../model/profile.model';
import { ApiResponse } from '../../../shared/models/responses/api-response.model';
import { PaginationResponse } from '../../../shared/models/responses/pagination-response.model';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  readonly #http = inject(HttpClient);
  readonly #profileUrl = `${environment.apiBaseUrl}/UserProfile`;
  readonly #accountUrl = `${environment.apiBaseUrl}/Account`;

  getUserInfo(): Observable<ApiResponse<GetUserInfoDTO>> {
    return this.#http.get<ApiResponse<GetUserInfoDTO>>(`${this.#profileUrl}/GetInfo`);
  }

  /** PUT /UserProfile/UpdateName */
  updateName(dto: UpdateNameDTO): Observable<ApiResponse<boolean>> {
    const formData = new FormData();
    formData.append('firstName', dto.firstName);
    formData.append('lastName', dto.lastName);
    return this.#http.put<ApiResponse<boolean>>(`${this.#profileUrl}/UpdateName`, formData);
  }

  /** PUT /UserProfile/UpdateProfileImage */
  updateProfileImage(dto: UpdateProfileImageDTO): Observable<ApiResponse<boolean>> {
    const formData = new FormData();
    formData.append('profileImage', dto.profileImage);
    return this.#http.put<ApiResponse<boolean>>(`${this.#profileUrl}/UpdateProfileImage`, formData);
  }

  /** PUT /UserProfile/AddIdImage */
  addIdImage(dto: AddIdImageDTO): Observable<ApiResponse<boolean>> {
    const formData = new FormData();
    formData.append('identificationImage', dto.identificationImage);
    return this.#http.put<ApiResponse<boolean>>(`${this.#profileUrl}/AddIdImage`, formData);
  }

  /** PUT /UserProfile/UpdateHomeLocation */
  updateHomeLocation(dto: UpdateHomeLocationDTO): Observable<ApiResponse<boolean>> {
    const formData = new FormData();
    formData.append('homeLatitude', dto.homeLatitude.toString());
    formData.append('homeLongitude', dto.homeLongitude.toString());
    return this.#http.put<ApiResponse<boolean>>(`${this.#profileUrl}/UpdateHomeLocation`, formData);
  }

  removeProfileImage(): Observable<ApiResponse<boolean>> {
    return this.#http.delete<ApiResponse<boolean>>(`${this.#profileUrl}/ProfileImage`);
  }
  updatePhoneNumber(phoneNumber: string): Observable<ApiResponse<boolean>> {
    const formData = new FormData();
    formData.append('PhoneNumber', phoneNumber);

    return this.#http.put<ApiResponse<boolean>>(`${this.#profileUrl}/UpdatePhoneNumber`, formData);
  }
  getMyCases(
    filter: MyCasesFilterRequest,
  ): Observable<ApiResponse<PaginationResponse<MyCaseListItemResponse>>> {
    let params = new HttpParams();

    if (filter.fullName?.trim()) {
      params = params.set('fullName', filter.fullName.trim());
    }

    if (filter.caseCode?.trim()) {
      params = params.set('caseCode', filter.caseCode.trim());
    }

    if (filter.caseType !== null && filter.caseType !== undefined) {
      params = params.set('caseType', filter.caseType.toString());
    }

    params = params.set('page', (filter.page ?? 1).toString());
    params = params.set('pageSize', (filter.pageSize ?? 6).toString());

    return this.#http.get<ApiResponse<PaginationResponse<MyCaseListItemResponse>>>(
      `${this.#profileUrl}/MyCases`,
      { params },
    );
  }
}
