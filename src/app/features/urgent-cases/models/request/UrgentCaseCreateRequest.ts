import { CaseUpsertBaseRequest } from "../../../../core/models/Cases.model";
import { RelationType } from "../../../../shared/enums/relation-type";

export interface UrgentCaseCreateRequest extends CaseUpsertBaseRequest {
  fName: string;
  lName: string;

  relation: RelationType;

  latitude: number;
  longitude: number;

  primaryImage: File;
  additionalImages: File[] | null;
}