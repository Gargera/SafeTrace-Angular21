import { CreateCaseBaseRequest } from "../../../../core/models/cases.model";

export interface UnknownCaseCreateRequest extends CreateCaseBaseRequest {
  fName?: string | null;
  lName?: string | null;
}