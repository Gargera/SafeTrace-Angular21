import { CaseDetailResponse } from "../../../../core/models/cases.model";

export interface UrgentCaseDetailResponse extends CaseDetailResponse {
  endDate: string | null; // DateTime? 
  limitReachDate: string | null; // DateTime?
  latitude: number | null; // double?
  longitude: number | null; // double?
}