import {ComplaintStatus} from "../../shared/enums/complaint-status";

export const COMPLAINT_STATUS_TRANSLATIONS_AR: Record<ComplaintStatus, string> = {
  [ComplaintStatus.Solved]: 'محلول',
  [ComplaintStatus.UnSolved]: 'غير محلول'
};

export function getComplaintStatusTranslationAr(status?: ComplaintStatus | null): string {
  if (!status) return '';

  return COMPLAINT_STATUS_TRANSLATIONS_AR[status];
}