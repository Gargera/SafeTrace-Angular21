import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { RoleDto } from '../models/Role/responses/RoleDto';
import { CreateRoleDto } from '../models/Role/requests/CreateRoleDto';
import { RolePermissionsResponseDto } from '../models/Role/responses/RolePermissionsResponseDto';
import { UpdateRolePermissionsDto } from '../models/Role/requests/UpdateRolePermissionsDto';
import { ApiResponse } from '../../../shared/models/api-response.model';
import { ApiService } from '../../../shared/services/api.service';
import { CacheService } from '../../../core/cache/cache.service';
import { CACHE_TAGS, CACHE_TTL } from '../../../core/cache/cache.constants';

@Injectable({ providedIn: 'root' })
export class RoleService extends ApiService {
  private readonly baseUrl = `${environment.baseUrl}/api/Roles`;
  private readonly cacheService = inject(CacheService);

  getAllRoles(): Observable<ApiResponse<RoleDto[]>> {
    return this.cacheService.getOrSet(
      'Roles_getAllRoles',
      () => this.get<ApiResponse<RoleDto[]>>(this.baseUrl),
      CACHE_TTL.STATIC,
      [CACHE_TAGS.STATIC_DATA]
    );
  }

  createRole(dto: CreateRoleDto): Observable<ApiResponse<string>> {
    return this.post<ApiResponse<string>>(`${this.baseUrl}/create`, dto).pipe(
      tap(() => this.cacheService.invalidateByTags([CACHE_TAGS.STATIC_DATA]))
    );
  }

  deleteRole(roleId: string): Observable<ApiResponse<string>> {
    return this.delete<ApiResponse<string>>(`${this.baseUrl}/delete/${roleId}`).pipe(
      tap(() => this.cacheService.invalidateByTags([CACHE_TAGS.STATIC_DATA]))
    );
  }

  getRolePermissions(roleId: string): Observable<ApiResponse<RolePermissionsResponseDto>> {
    const key = `Roles_getRolePermissions_${roleId}`;
    return this.cacheService.getOrSet(
      key,
      () => this.get<ApiResponse<RolePermissionsResponseDto>>(
        `${this.baseUrl}/GetPermissionsBy/${roleId}`
      ),
      CACHE_TTL.DETAILS,
      [CACHE_TAGS.STATIC_DATA]
    );
  }

  updateRolePermissions(dto: UpdateRolePermissionsDto): Observable<ApiResponse<string>> {
    return this.post<ApiResponse<string>>(`${this.baseUrl}/UpdatePermissions`, dto).pipe(
      tap(() => this.cacheService.invalidateByTags([CACHE_TAGS.STATIC_DATA]))
    );
  }
}
