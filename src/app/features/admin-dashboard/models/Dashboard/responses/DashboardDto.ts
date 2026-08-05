import { CaseTypeStatsDto } from './CaseTypeStatsDto';

export interface DashboardDto {
  totalUsers: number;
  totalCases: number;
  totalSolvedComplaints: number;
  totalUnSolvedComplaints: number;
  totalDailyAISearch: number;
  totalFoundedCases: number;
  totalActiveCases: number;
  totalDeletedCases: number;
  totalPendingCases: number;
  totalRejectedCases: number;
  totalExpiredCases: number;
  totalSumDonations: number;
  totalCountFailedDonations: number;
  totalCountSucceededDonations: number;
  totalCountPendingDonations: number;
  caseTypes: CaseTypeStatsDto[];
}
