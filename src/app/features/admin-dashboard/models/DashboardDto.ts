import { CaseTypeStatsDto } from './CaseTypeStatsDto';

export interface DashboardDto {
  totalUsers: number;
  totalCases: number;
  totalFoundedCases: number;
  totalActiveCases: number;
  totalClosedCases: number;
  totalDeletedCases: number;
  totalPendingCases: number;
  caseTypes: CaseTypeStatsDto[];
}
