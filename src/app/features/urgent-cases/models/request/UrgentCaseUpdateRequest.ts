import { CaseUpsertBaseRequest } from "../../../../core/models/Cases.model";
import { RelationType } from "../../../../shared/enums/relation-type";

export interface UrgentCaseUpdateRequest extends CaseUpsertBaseRequest {
  fName?: string;
  lName?: string;

  relation?: RelationType | null;

  latitude?: number;
  longitude?: number;

  primaryImage?: File | null;

  newPhotos: File[] | null;
  deletedPhotoIds: number[] | null;
  primaryPhotoId: number | null;
}