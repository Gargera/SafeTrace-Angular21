import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';
import { GetUserInfoDTO, UpdateProfileInfoDTO } from '../models/profile.model';
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}
@Injectable({ providedIn: 'root' })
export class ProfileService {
  readonly #http = inject(HttpClient);
  readonly #baseUrl = `${environment.apiBaseUrl}/UserProfile`;

  getUserInfo(): Observable<ApiResponse<GetUserInfoDTO>> {
    return this.#http.get<ApiResponse<GetUserInfoDTO>>(`${this.#baseUrl}/GetInfo`);
    // return this.#http.get<GetUserInfoDTO>(`${this.#baseUrl}/GetInfo`);
  }

  updateUserInfo(dto: UpdateProfileInfoDTO): Observable<GetUserInfoDTO> {
    const formData = new FormData();
    formData.append('firstName', dto.firstName);
    formData.append('lastName', dto.lastName);
    formData.append('currentPassword', dto.currentPassword);
    formData.append('newPassword', dto.newPassword);

    if (dto.homeLatitude !== null && dto.homeLatitude !== undefined) {
      formData.append('homeLatitude', dto.homeLatitude.toString());
    }
    if (dto.homeLongitude !== null && dto.homeLongitude !== undefined) {
      formData.append('homeLongitude', dto.homeLongitude.toString());
    }
    if (dto.profileImage) {
      formData.append('profileImage', dto.profileImage);
    }
    if (dto.identificationImage) {
      formData.append('identificationImage', dto.identificationImage);
    }

    return this.#http.put<GetUserInfoDTO>(`${this.#baseUrl}/UpdateInfo`, formData);
  }
}
