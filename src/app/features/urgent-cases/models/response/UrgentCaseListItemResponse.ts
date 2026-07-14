import { CaseListItemResponse } from '../../../../core/models/Cases.model';

export interface UrgentCaseListItemResponse extends CaseListItemResponse {
  endDate: string; // DateTime (non-nullable in backend)
}