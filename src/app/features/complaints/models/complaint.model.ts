import { ComplaintStatus } from '../../../shared/enums/complaint-status';

export { ComplaintStatus };

 export interface ComplaintResponseDto {
  id: number;
  userId: string;
  userEmail: string;
  caseCode: string | null;
  message: string;
  solutionMessage: string | null;
  complaintStatus: ComplaintStatus;
  createdAt: string;
}

export interface PaginationResponse<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages?: number;
}