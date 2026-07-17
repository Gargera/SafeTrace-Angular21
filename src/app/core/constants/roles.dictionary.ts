import { UserRole } from '../../shared/enums/user-role';

export const ROLE_TRANSLATIONS_AR: Record<UserRole, string> = {
  [UserRole.Admin]: 'مدير النظام',
  [UserRole.Moderator]: 'مشرف',
  [UserRole.VerifiedUser]: 'مستخدم موثق',
  [UserRole.User]: 'مستخدم غير موثق'
};

export function getRoleTranslationAr(roleName?: string | null): string {
  if (!roleName) return '';

  const normalizedRole = Object.values(UserRole).find((value) => value === roleName);
  return normalizedRole ? ROLE_TRANSLATIONS_AR[normalizedRole as UserRole] : roleName;
}