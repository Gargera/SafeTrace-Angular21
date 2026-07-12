import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  AddIdImageDTO,
  ChangePasswordDTO,
  GetUserInfoDTO,
  UpdateHomeLocationDTO,
  UpdateNameDTO,
  UpdateProfileImageDTO,
} from '../model/profile.model';
import { ApiResponse } from '../../../shared/models/responses/api-response.model';



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
  /**
   * POST /Account/change-password
   * NOTE: this one is JSON, not form-data — different controller, different binding ([FromBody]).
   */
  changePassword(dto: ChangePasswordDTO): Observable<ApiResponse<boolean>> {
    return this.#http.post<ApiResponse<boolean>>(`${this.#accountUrl}/change-password`, dto);
  }
}
