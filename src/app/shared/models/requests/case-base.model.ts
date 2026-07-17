import { Gender } from '../../enums/gender';

/**
 * Mirrors CaseUpsertBaseDto (backend, abstract).
 * Common fields shared between Create and Update for all 3 case types.
 */
export interface CaseUpsertBaseRequest {
  gender: Gender;
  age: number;
  government: string;
  city: string;
  street: string;
  /** ISO date string (yyyy-MM-dd) */
  eventDate: string;

  sName?: string | null;
  tName?: string | null;
  communicationPhone?: string | null;
  description?: string | null;

  /** Max 4 additional images */
  additionalImages?: File[] | null;
  video?: File | null;
}

/**
 * Mirrors CaseCreateBaseDto. PrimaryImage is required on create.
 */
export interface CaseCreateBaseRequest extends CaseUpsertBaseRequest {
  primaryImage: File;
}

/**
 * Mirrors CaseUpdateBaseDto.
 *
 * NOTE: the backend's CaseUpdateBaseDto inherits PrimaryImage as [Required] from
 * CaseUpsertBaseDto and does NOT override it. That means, as the backend DTOs are
 * written today, every Update call would still require a brand-new primary image
 * file to be uploaded — which defeats the purpose of PrimaryPhotoId (picking an
 * existing photo as primary). This is almost certainly a backend oversight and
 * should be fixed there (make PrimaryImage optional on CaseUpdateBaseDto, e.g.
 * `public new IFormFile? PrimaryImage { get; set; }`).
 *
 * Frontend behavior chosen here: primaryImage is optional. We only send it if the
 * user actually picks a new primary photo during edit; otherwise we rely on
 * primaryPhotoId to point at an existing photo. If the backend still 400s because
 * PrimaryImage is missing, that confirms the DTO needs the fix above.
 */
export interface CaseUpdateBaseRequest extends CaseUpsertBaseRequest {
  /** New primary image file, only if the user replaced it */
  primaryImage?: File | null;

  /** Newly added additional photos (appended, not replacing existing ones) */
  newPhotos?: File[] | null;

  /** IDs of existing CaseFiles the user removed */
  deletedPhotoIds?: number[] | null;

  /** ID of an existing CaseFile to promote as the primary photo */
  primaryPhotoId?: number | null;
}
