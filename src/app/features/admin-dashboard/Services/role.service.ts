import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment.development';
import { ApiResponse } from '../../user-profile/Service/profile.service';
import { RoleDto } from '../models/Role/RoleDto';
import { CreateRoleDto } from '../models/Role/CreateRoleDto';
import { RolePermissionsResponseDto } from '../models/Role/RolePermissionsResponseDto';
import { UpdateRolePermissionsDto } from '../models/Role/UpdateRolePermissionsDto';

@Injectable({ providedIn: 'root' })
export class RoleService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.baseUrl}/api/Roles`;

  getAllRoles(): Observable<ApiResponse<RoleDto[]>> {
    return this.http.get<ApiResponse<RoleDto[]>>(this.baseUrl);
  }

  createRole(dto: CreateRoleDto): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(`${this.baseUrl}/create`, dto);
  }

  deleteRole(roleId: string): Observable<ApiResponse<string>> {
    return this.http.delete<ApiResponse<string>>(`${this.baseUrl}/delete/${roleId}`);
  }

  getRolePermissions(roleId: string): Observable<ApiResponse<RolePermissionsResponseDto>> {
    return this.http.get<ApiResponse<RolePermissionsResponseDto>>(`${this.baseUrl}/GetPermissionsBy/${roleId}`);
  }

  updateRolePermissions(dto: UpdateRolePermissionsDto): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(`${this.baseUrl}/UpdatePermissions`, dto);
  }
}