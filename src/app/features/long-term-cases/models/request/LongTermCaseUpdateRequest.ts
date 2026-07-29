import { UpdateCaseBaseRequest } from "../../../../core/models/Cases.model";
import { RelationType } from "../../../../shared/enums/relation-type";

export interface LongTermCaseUpdateRequest extends UpdateCaseBaseRequest {
  fName: string;
  lName: string;
  relation: RelationType;
  policeReportImage?: File | null;
}