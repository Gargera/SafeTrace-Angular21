import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const ALLOWED_VIDEO_EXTENSIONS = [
  '.mp4',
  '.mov',
  '.webm'
] as const;

export const ALLOWED_VIDEO_CONTENT_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/webm'
] as const;

export const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB


export const VIDEO_VALIDATION_ERRORS = {
  INVALID_TYPE: 'يسمح فقط بفيديوهات MP4 و MOV و WebM.',
  MAX_SIZE: (maxMb: number = 50) =>
    `حجم الفيديو يتجاوز الحد المسموح (${maxMb} MB).`,
};


export interface VideoValidationResult {
  valid: boolean;
  errorMessage?: string;
}


export function isVideoExtensionValid(filename: string): boolean {
  if (!filename) return false;

  const extIndex = filename.lastIndexOf('.');
  if (extIndex === -1) return false;

  const ext = filename.slice(extIndex).toLowerCase();

  return ALLOWED_VIDEO_EXTENSIONS.includes(
    ext as (typeof ALLOWED_VIDEO_EXTENSIONS)[number]
  );
}


export function isVideoContentTypeValid(contentType: string): boolean {
  if (!contentType) return false;

  return ALLOWED_VIDEO_CONTENT_TYPES.includes(
    contentType.toLowerCase() as (typeof ALLOWED_VIDEO_CONTENT_TYPES)[number]
  );
}


/**
 * Validates video file:
 * - Extension (.mp4, .mov, .webm)
 * - MIME type
 * - Max size 50 MB
 */
export function validateVideoFile(
  file: File,
  maxMb: number = 50
): VideoValidationResult {

  if (!file) {
    return {
      valid: false,
      errorMessage: 'لم يتم اختيار ملف.'
    };
  }


  const extensionValid = isVideoExtensionValid(file.name);
  const contentTypeValid = isVideoContentTypeValid(file.type);


  if (!extensionValid || !contentTypeValid) {
    return {
      valid: false,
      errorMessage: VIDEO_VALIDATION_ERRORS.INVALID_TYPE
    };
  }


  const maxBytes = maxMb * 1024 * 1024;

  if (file.size > maxBytes) {
    return {
      valid: false,
      errorMessage: VIDEO_VALIDATION_ERRORS.MAX_SIZE(maxMb)
    };
  }


  return {
    valid: true
  };
}


/**
 * Reactive Forms validator
 */
export function allowedVideoTypes(): ValidatorFn {

  return (control: AbstractControl): ValidationErrors | null => {

    const file = control.value as File;

    if (!file) {
      return null;
    }

    const valid =
      isVideoExtensionValid(file.name) &&
      isVideoContentTypeValid(file.type);

    return valid
      ? null
      : { allowedVideoTypes: true };
  };
}


/**
 * Reactive Forms validator
 */
export function maxVideoSize(maxMb: number = 50): ValidatorFn {

  const maxBytes = maxMb * 1024 * 1024;

  return (control: AbstractControl): ValidationErrors | null => {

    const file = control.value as File;

    if (!file) {
      return null;
    }

    return file.size <= maxBytes
      ? null
      : { maxVideoSize: { maxMb } };
  };
}