import { UpdateCaseBaseRequest } from "../../../../core/models/cases.model";

export interface UnknownCaseUpdateRequest extends UpdateCaseBaseRequest {
  fName?: string | null;
  lName?: string | null;
}