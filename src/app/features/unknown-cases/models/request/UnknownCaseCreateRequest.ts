import { CaseUpsertBaseRequest } from "../../../../core/models/Cases.model";

export interface UnknownCaseCreateRequest extends CaseUpsertBaseRequest {
  fName: string | null;
  lName: string | null;

  primaryImage: File;
  additionalImages: File[] | null;
}