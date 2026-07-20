 import { ComplaintStatus } from '../../../shared/enums/complaint-status';

export interface ComplaintFilterDto {
  caseCode?: string;
  /** بحث حر يطابق البريد الإلكتروني أو كود الحالة */
  search?: string;
  status?: ComplaintStatus;
  pageNumber: number;
  pageSize: number;
}