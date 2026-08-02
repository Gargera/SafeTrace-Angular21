import { CaseListItemResponse } from '../../../../core/models/cases.model';

export interface UrgentCaseListItemResponse extends CaseListItemResponse {
  endDate: string; // DateTime (non-nullable in backend)
}