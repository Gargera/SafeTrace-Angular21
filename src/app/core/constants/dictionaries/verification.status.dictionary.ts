import { VerificationStatus } from '../../../shared/enums/verification-status';

export const VERIFICATION_STATUS_TRANSLATIONS_AR: Record<VerificationStatus, string> = {
  [VerificationStatus.Unverified]: 'غير موثق',
  [VerificationStatus.Pending]: 'قيد المراجعة',
  [VerificationStatus.Verified]: 'موثق',
};

export function getVerificationStatusTranslationAr(status?: string | null): string {
  if (!status) return '';

  const normalizedValue = Object.values(VerificationStatus).find((value) => value === status);
  return normalizedValue ? VERIFICATION_STATUS_TRANSLATIONS_AR[normalizedValue as VerificationStatus] : status;
}
