 import { ComplaintStatus } from '../../../../shared/enums/complaint-status';

export interface ComplaintFilterDto {
  caseCode?: string;
  contactType?: string;
  /** بحث حر يطابق البريد الإلكتروني أو كود الحالة */
  search?: string;
  status?: ComplaintStatus | null;
  pageNumber: number;
  pageSize: number;
}