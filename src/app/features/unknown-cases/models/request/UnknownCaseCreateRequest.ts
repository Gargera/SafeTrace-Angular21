import { CreateCaseBaseRequest } from "../../../../core/models/Cases.model";

export interface UnknownCaseCreateRequest extends CreateCaseBaseRequest {
  fName?: string | null;
  lName?: string | null;
}