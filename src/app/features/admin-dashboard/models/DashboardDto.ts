import { CaseTypeStatsDto } from './CaseTypeStatsDto';

export interface DashboardDto {
  totalUsers: number;
  totalCases: number;
  totalFoundedCases: number;
  totalActiveCases: number;
  totalDeletedCases: number;
  totalPendingCases: number;
  totalRejectedgCases: number;
  totalExpiredCases: number;
  totalSumDonations: number;
  totalCountFailedDonations: number;
  totalCountSucceededDonations: number;
  totalCountPendingDonations: number;
  caseTypes: CaseTypeStatsDto[];
}
