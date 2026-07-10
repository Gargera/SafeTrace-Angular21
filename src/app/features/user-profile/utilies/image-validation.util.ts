export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export interface ImageValidationResult {
  valid: boolean;
  errorMessage?: string;
}

export function validateProfileImage(file: File): ImageValidationResult {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return {
      valid: false,
      errorMessage: 'Unsupported file type. Please choose a JPG, PNG, or WEBP image.',
    };
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return {
      valid: false,
      errorMessage: 'Image is too large. Maximum allowed size is 5 MB.',
    };
  }

  return { valid: true };
}
