import { AgeSort } from '../../../../../shared/enums/age-sort';
import { CaseStatus } from '../../../../../shared/enums/case-status';
import { CaseType } from '../../../../../shared/enums/case-type';
import { DateSort } from '../../../../../shared/enums/date-sort';
import { Gender } from '../../../../../shared/enums/gender';

export interface CasesReportFilterDto {
  // Status
  status?: CaseStatus | null;
  type?: CaseType | null;
  gender?: Gender | null;

  // Text Search
  fullName?: string;
  caseCode?: string;
  government?: string;
  city?: string;

  // Age Filter
  minAge?: number | null;
  maxAge?: number | null;

  // Date Filter
  fromDate?: string | null;
  toDate?: string | null;

  // Sorting
  ageSort?: AgeSort | null;
  dateSort?: DateSort | null;

  // Pagination
  page: number;
  pageSize: number;
}