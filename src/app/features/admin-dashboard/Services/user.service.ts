import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GetUserDto } from '../models/User/GetUserDto';
import { environment } from '../../../../environments/environment';
import { UserFilterDto } from '../models/User/UserFilterDto';
import { PaginationResponse } from '../../../shared/models/responses/pagination-response.model';
import { GetUserByIdDto } from '../models/User/GetUserByIdDto';
import { ChangeUserRoleDto } from '../models/User/ChangeUserRoleDto';
import { UserPermissionsResponseDto } from '../models/User/UserPermissionsResponseDto';
import { AssignUserPermissionsDto } from '../models/User/AssignUserPermissionsDto';
import { RegisterByAdminDto } from '../models/User/RegisterByAdminDto';
import { UserStatisticsDto } from '../models/User/UserStatisticsDto';
import { ApiResponse } from '../../../shared/models/responses/api-response.model';
import { ApiService } from '../../../shared/services/api.service';

@Injectable({ providedIn: 'root' })
export class UserService extends ApiService {
  private readonly baseUrl = `${environment.baseUrl}/api/Users`;

  getAllUsers(filter: UserFilterDto): Observable<ApiResponse<PaginationResponse<GetUserDto>>> {
    return this.get<ApiResponse<PaginationResponse<GetUserDto>>>(this.baseUrl, filter as Record<string, any>);
  }

  getUserById(userId: string): Observable<ApiResponse<GetUserByIdDto>> {
    return this.getById<ApiResponse<GetUserByIdDto>>(this.baseUrl, userId);
  }

  registerByAdmin(dto: RegisterByAdminDto): Observable<ApiResponse<string>> {
    return this.post<ApiResponse<string>>(`${this.baseUrl}/register-by-admin`, dto);
  }

  changeUserRole(dto: ChangeUserRoleDto): Observable<ApiResponse<string>> {
    return this.post<ApiResponse<string>>(`${this.baseUrl}/ChangeRole`, dto);
  }

  approveUser(userId: string): Observable<ApiResponse<string>> {
    return this.post<ApiResponse<string>>(`${this.baseUrl}/approve/${userId}`, {});
  }

  rejectUser(userId: string, reason: string): Observable<ApiResponse<string>> {
    return this.post<ApiResponse<string>>(`${this.baseUrl}/reject/${userId}`, { reason });
  }

  toggleBlockStatus(userId: string, reason?: string): Observable<ApiResponse<string>> {
    return this.post<ApiResponse<string>>(`${this.baseUrl}/toggle-block/${userId}`, { reason: reason || null });
  }

  getUserPermissions(userId: string): Observable<ApiResponse<UserPermissionsResponseDto>> {
    return this.get<ApiResponse<UserPermissionsResponseDto>>(
      `${this.baseUrl}/GetPermissions/${userId}`
    );
  }

  assignUserPermissions(dto: AssignUserPermissionsDto): Observable<ApiResponse<string>> {
    return this.post<ApiResponse<string>>(`${this.baseUrl}/AssignPermissions`, dto);
  }

  getUsersStatistics(): Observable<ApiResponse<UserStatisticsDto>> {
    return this.get<ApiResponse<UserStatisticsDto>>(`${this.baseUrl}/statistics`);
  }
}
