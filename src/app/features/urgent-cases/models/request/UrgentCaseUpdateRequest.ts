import { UpdateCaseBaseRequest } from "../../../../core/models/cases.model";
import { RelationType } from "../../../../shared/enums/relation-type";

export interface UrgentCaseUpdateRequest extends UpdateCaseBaseRequest {
  fName: string;
  lName: string;
  relation: RelationType;
  latitude?: number;
  longitude?: number;
}