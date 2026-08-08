import { CreateCaseBaseRequest } from "../../../../core/models/cases.model";
import { RelationType } from "../../../../shared/enums/relation-type";

export interface UrgentCaseCreateRequest extends CreateCaseBaseRequest {
  fName: string;
  lName: string;

  relation: RelationType;
  latitude: number;
  longitude: number;
}