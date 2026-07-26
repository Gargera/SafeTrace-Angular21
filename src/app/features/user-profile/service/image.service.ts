import { inject, Injectable } from '@angular/core';
import { SnackbarService } from '../../../core/services/toast.service';
import { validateImageFile as validateUtil } from '../tabs/Edit-profile/utilies/image-validation.util';

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
    const result = validateUtil(file, 5);
    if (!result.valid && result.errorMessage) {
      this.#snackbar.error(result.errorMessage);
      return false;
    }
    return true;
  }
}
