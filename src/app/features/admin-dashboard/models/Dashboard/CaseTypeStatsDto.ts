export interface CaseTypeStatsDto {
  caseType: string;
  total: number;
  active: number;
  deleted: number;
  pending: number;
  found: number;
  rejected: number;
  expired: number;
}
