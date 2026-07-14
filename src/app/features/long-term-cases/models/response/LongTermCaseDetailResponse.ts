import { CaseDetailResponse } from "../../../../core/models/Cases.model";

export interface LongTermCaseDetailResponse extends CaseDetailResponse {
  policeReportImage: string | null; // string?
}