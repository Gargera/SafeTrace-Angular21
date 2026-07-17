import { CaseUpsertBaseRequest } from "../../../../core/models/Cases.model";

export interface UnknownCaseUpdateRequest extends CaseUpsertBaseRequest {
  fName?: string | null;
  lName?: string | null;

  primaryImage?: File | null;

  newPhotos: File[] | null;
  deletedPhotoIds: number[] | null;
  primaryPhotoId: number | null;
}