import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { GetUserDto } from '../models/User/responses/GetUserDto';
import { environment } from '../../../../environments/environment';
import { UserFilterDto } from '../models/User/requests/UserFilterDto';
import { PaginationResponse } from '../../../shared/models/responses/pagination-response.model';
import { GetUserByIdDto } from '../models/User/responses/GetUserByIdDto';
import { ChangeUserRoleDto } from '../models/User/requests/ChangeUserRoleDto';
import { UserPermissionsResponseDto } from '../models/User/responses/UserPermissionsResponseDto';
import { AssignUserPermissionsDto } from '../models/User/requests/AssignUserPermissionsDto';
import { RegisterByAdminDto } from '../models/User/requests/RegisterByAdminDto';
import { UserStatisticsDto } from '../models/User/responses/UserStatisticsDto';
import { ApiResponse } from '../../../shared/models/responses/api-response.model';
import { ApiService } from '../../../shared/services/api.service';
import { CacheService } from '../../../core/cache/cache.service';
import { CACHE_TAGS, CACHE_TTL } from '../../../core/cache/cache.constants';

@Injectable({ providedIn: 'root' })
export class UserService extends ApiService {
  private readonly baseUrl = `${environment.baseUrl}/api/Users`;
  private readonly cacheService = inject(CacheService);

  getAllUsers(filter: UserFilterDto): Observable<ApiResponse<PaginationResponse<GetUserDto>>> {
    const key = `Users_getAllUsers_${JSON.stringify(filter)}`;
    return this.cacheService.getOrSet(
      key,
      () => this.get<ApiResponse<PaginationResponse<GetUserDto>>>(this.baseUrl, filter as Record<string, any>),
      CACHE_TTL.LIST,
      [CACHE_TAGS.USERS]
    );
  }

  getUserById(userId: string): Observable<ApiResponse<GetUserByIdDto>> {
    const key = `Users_getUserById_${userId}`;
    return this.cacheService.getOrSet(
      key,
      () => this.getById<ApiResponse<GetUserByIdDto>>(this.baseUrl, userId),
      CACHE_TTL.DETAILS,
      [CACHE_TAGS.USERS]
    );
  }

  registerByAdmin(dto: RegisterByAdminDto): Observable<ApiResponse<string>> {
    return this.post<ApiResponse<string>>(`${this.baseUrl}/register-by-admin`, dto).pipe(
      tap(() => this.cacheService.invalidateByTags([CACHE_TAGS.USERS]))
    );
  }

  changeUserRole(dto: ChangeUserRoleDto): Observable<ApiResponse<string>> {
    return this.post<ApiResponse<string>>(`${this.baseUrl}/ChangeRole`, dto).pipe(
      tap(() => this.cacheService.invalidateByTags([CACHE_TAGS.USERS]))
    );
  }

  approveUser(userId: string): Observable<ApiResponse<string>> {
    return this.post<ApiResponse<string>>(`${this.baseUrl}/approve/${userId}`, {}).pipe(
      tap(() => this.cacheService.invalidateByTags([CACHE_TAGS.USERS]))
    );
  }

  rejectUser(userId: string, reason: string): Observable<ApiResponse<string>> {
    return this.post<ApiResponse<string>>(
      `${this.baseUrl}/Reject/${userId}`,
      { reason: reason }
    ).pipe(
      tap(() => this.cacheService.invalidateByTags([CACHE_TAGS.USERS]))
    );
  }

  toggleBlockStatus(userId: string, reason?: string): Observable<ApiResponse<string>> {
    return this.post<ApiResponse<string>>(
      `${this.baseUrl}/toggle-block/${userId}`,
      { reason: reason || '' }
    ).pipe(
      tap(() => this.cacheService.invalidateByTags([CACHE_TAGS.USERS]))
    );
  }

  getUserPermissions(userId: string): Observable<ApiResponse<UserPermissionsResponseDto>> {
    const key = `Users_getUserPermissions_${userId}`;
    return this.cacheService.getOrSet(
      key,
      () => this.get<ApiResponse<UserPermissionsResponseDto>>(`${this.baseUrl}/GetPermissions/${userId}`),
      CACHE_TTL.DETAILS,
      [CACHE_TAGS.USERS]
    );
  }

  assignUserPermissions(dto: AssignUserPermissionsDto): Observable<ApiResponse<string>> {
    return this.post<ApiResponse<string>>(`${this.baseUrl}/AssignPermissions`, dto).pipe(
      tap(() => this.cacheService.invalidateByTags([CACHE_TAGS.USERS]))
    );
  }

  getUsersStatistics(): Observable<ApiResponse<UserStatisticsDto>> {
    const key = `Users_getUsersStatistics`;
    return this.cacheService.getOrSet(
      key,
      () => this.get<ApiResponse<UserStatisticsDto>>(`${this.baseUrl}/statistics`),
      CACHE_TTL.LIST,
      [CACHE_TAGS.USERS]
    );
  }
}
