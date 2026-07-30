import { CaseDetailResponse } from "../../../../core/models/cases.model";

export interface LongTermCaseDetailResponse extends CaseDetailResponse {
  policeReportImage: string | null; // string?
}