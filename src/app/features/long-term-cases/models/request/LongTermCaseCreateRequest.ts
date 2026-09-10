import { CreateCaseBaseRequest } from "../../../../core/models/cases.model";
import { RelationType } from "../../../../shared/enums/relation-type";

export interface LongTermCaseCreateRequest extends CreateCaseBaseRequest {
  fName: string;
  lName: string;

  relation: RelationType;
  policeReportImage: File | null;
}