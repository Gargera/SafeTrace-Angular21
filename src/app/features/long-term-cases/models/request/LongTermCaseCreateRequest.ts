import { CaseUpsertBaseRequest } from "../../../../core/models/Cases.model";
import { RelationType } from "../../../../shared/enums/relation-type";

export interface LongTermCaseCreateRequest extends CaseUpsertBaseRequest {
  fName: string;
  lName: string;

  relation: RelationType;

  primaryImage: File;
  additionalImages: File[] | null;

  policeReportImage: File | null;
}