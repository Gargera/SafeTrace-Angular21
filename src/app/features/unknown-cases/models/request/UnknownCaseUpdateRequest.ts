import { UpdateCaseBaseRequest } from "../../../../core/models/Cases.model";

export interface UnknownCaseUpdateRequest extends UpdateCaseBaseRequest {
  fName?: string | null;
  lName?: string | null;
}