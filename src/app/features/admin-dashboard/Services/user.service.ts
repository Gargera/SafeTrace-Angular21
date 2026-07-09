import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { GetUserDto } from '../models/User/GetUserDto';
import { environment } from '../../../../environments/environment.development';
import { UserFilterDto } from '../models/User/UserFilterDto';
import { PaginationResponse } from '../../../shared/models/responses/pagination-response.model';
import { ApiResponse } from '../../user-profile/Service/profile.service';
import { GetUserByIdDto } from '../models/User/GetUserByIdDto';
import { ChangeUserRoleDto } from '../models/User/ChangeUserRoleDto';
import { UserPermissionsResponseDto } from '../models/User/UserPermissionsResponseDto';
import { AssignUserPermissionsDto } from '../models/User/AssignUserPermissionsDto';
import { RegisterByAdminDto } from '../models/User/RegisterByAdminDto';


@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.baseUrl}/api/Users`;

  getAllUsers(filter: UserFilterDto): Observable<ApiResponse<PaginationResponse<GetUserDto>>> {
    let params = new HttpParams()
      .set('PageNumber', filter.pageNumber)
      .set('PageSize', filter.pageSize);

    if (filter.searchTerm) params = params.set('SearchTerm', filter.searchTerm);
    if (filter.verificationStatus) params = params.set('VerificationStatus', filter.verificationStatus);
    if (filter.roleId) params = params.set('RoleId', filter.roleId);

    return this.http.get<ApiResponse<PaginationResponse<GetUserDto>>>(this.baseUrl, { params });
  }

  getUserById(userId: string): Observable<ApiResponse<GetUserByIdDto>> {
    return this.http.get<ApiResponse<GetUserByIdDto>>(`${this.baseUrl}/${userId}`);
  }

  registerByAdmin(dto: RegisterByAdminDto): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(`${this.baseUrl}/register-by-admin`, dto);
  }

  changeUserRole(dto: ChangeUserRoleDto): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(`${this.baseUrl}/ChangeRole`, dto);
  }

  approveUser(userId: string): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(`${this.baseUrl}/approve/${userId}`, {});
  }

  rejectUser(userId: string): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(`${this.baseUrl}/reject/${userId}`, {});
  }

  toggleBlockStatus(userId: string): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(`${this.baseUrl}/toggle-block/${userId}`, {});
  }

  getUserPermissions(userId: string): Observable<ApiResponse<UserPermissionsResponseDto>> {
    return this.http.get<ApiResponse<UserPermissionsResponseDto>>(`${this.baseUrl}/GetPermissions/${userId}`);
  }

  assignUserPermissions(dto: AssignUserPermissionsDto): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(`${this.baseUrl}/AssignPermissions`, dto);
  }
}