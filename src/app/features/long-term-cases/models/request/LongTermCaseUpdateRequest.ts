import { CaseUpsertBaseRequest } from "../../../../core/models/Cases.model";
import { RelationType } from "../../../../shared/enums/relation-type";

export interface LongTermCaseUpdateRequest extends CaseUpsertBaseRequest {
  fName: string;
  lName: string;

  relation?: RelationType | null;

  primaryImage?: File | null;

  newPhotos: File[] | null;
  deletedPhotoIds: number[] | null;
  primaryPhotoId: number | null;

  policeReportImage?: File | null;
}