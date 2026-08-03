import { UserPermissionDto } from "./UserPermissionDto";

export interface UserPermissionsResponseDto {
  userId: string;
  email: string;
  permissions: UserPermissionDto[];
}