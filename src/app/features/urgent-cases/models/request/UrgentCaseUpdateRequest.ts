import { CaseUpdateBaseRequest } from "../../../../core/models/Cases.model";

export interface UrgentCaseUpdateRequest extends CaseUpdateBaseRequest {
  newPhotos: File[] | null;
  deletedPhotoIds: number[] | null;
  primaryPhotoId: number | null;
}