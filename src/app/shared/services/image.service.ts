import { inject, Injectable } from '@angular/core';
import { SnackbarService } from './toast.service';
import { validateImageFile as validateUtil, ImageValidationResult } from '../validators/image-validation.validator';

@Injectable({
  providedIn: 'root',
})
export class ImageService {
  readonly #snackbar = inject(SnackbarService);

  /**
   * Validates the image and returns the result. 
   * Useful when components want to handle the error display themselves.
   */
  validate(file: File, maxMb: number = 5): ImageValidationResult {
    return validateUtil(file, maxMb);
  }

  /**
   * Validates the image. If invalid, shows a toast with the error message.
   * Returns true if valid, false otherwise.
   */
  validateAndToast(file: File, maxMb: number = 5): boolean {
    const result = this.validate(file, maxMb);
    if (!result.valid && result.errorMessage) {
      this.#snackbar.error(result.errorMessage);
      return false;
    }
    return true;
  }
}
