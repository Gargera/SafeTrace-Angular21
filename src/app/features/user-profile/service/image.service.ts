import { inject, Injectable } from '@angular/core';
import { SnackbarService } from '../../../core/services/toast.service';

const ALLOWED_PROFILE_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PROFILE_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

@Injectable({
  providedIn: 'root',
})
export class ImageService {
  readonly #snackbar = inject(SnackbarService);

  /**
   * Returns true if the file passes type/size checks; shows a toast and
   * returns false otherwise.
   */
  validateImageFile(file: File): boolean {
    if (!ALLOWED_PROFILE_IMAGE_TYPES.includes(file.type)) {
      this.#snackbar.error('صيغة الصورة غير مدعومة. يُسمح فقط بـ JPG أو PNG أو WEBP.');
      return false;
    }

    if (file.size > MAX_PROFILE_IMAGE_SIZE_BYTES) {
      this.#snackbar.error('حجم الصورة يتجاوز الحد الأقصى المسموح به (5 ميجابايت).');
      return false;
    }

    return true;
  }
}
