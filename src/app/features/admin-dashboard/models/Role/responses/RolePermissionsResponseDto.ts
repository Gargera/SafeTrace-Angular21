import { RolePermissionDto } from "./RolePermissionDto";

export interface RolePermissionsResponseDto {
  roleId: string;
  roleName: string;
  permissions: RolePermissionDto[];
}