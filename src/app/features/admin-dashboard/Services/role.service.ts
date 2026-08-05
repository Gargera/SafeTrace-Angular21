import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { RoleDto } from '../models/Role/responses/RoleDto';
import { CreateRoleDto } from '../models/Role/requests/CreateRoleDto';
import { RolePermissionsResponseDto } from '../models/Role/responses/RolePermissionsResponseDto';
import { UpdateRolePermissionsDto } from '../models/Role/requests/UpdateRolePermissionsDto';
import { ApiResponse } from '../../../shared/models/responses/api-response.model';
import { ApiService } from '../../../shared/services/api.service';

@Injectable({ providedIn: 'root' })
export class RoleService extends ApiService {
  private readonly baseUrl = `${environment.baseUrl}/api/Roles`;

  getAllRoles(): Observable<ApiResponse<RoleDto[]>> {
    return this.get<ApiResponse<RoleDto[]>>(this.baseUrl);
  }

  createRole(dto: CreateRoleDto): Observable<ApiResponse<string>> {
    return this.post<ApiResponse<string>>(`${this.baseUrl}/create`, dto);
  }

  deleteRole(roleId: string): Observable<ApiResponse<string>> {
    return this.delete<ApiResponse<string>>(`${this.baseUrl}/delete/${roleId}`);
  }

  getRolePermissions(roleId: string): Observable<ApiResponse<RolePermissionsResponseDto>> {
    return this.get<ApiResponse<RolePermissionsResponseDto>>(
      `${this.baseUrl}/GetPermissionsBy/${roleId}`
    );
  }

  updateRolePermissions(dto: UpdateRolePermissionsDto): Observable<ApiResponse<string>> {
    return this.post<ApiResponse<string>>(`${this.baseUrl}/UpdatePermissions`, dto);
  }
}
