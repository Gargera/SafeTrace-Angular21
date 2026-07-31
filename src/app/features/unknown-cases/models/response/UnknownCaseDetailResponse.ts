import { CaseDetailResponse } from "../../../../core/models/cases.model";
import { RelatedCaseResponse } from "./RelatedCaseResponse";

export interface UnknownCaseDetailResponse extends CaseDetailResponse {
  // Unknown case specific detail fields - add here if any
  relatedCases: RelatedCaseResponse[];
}