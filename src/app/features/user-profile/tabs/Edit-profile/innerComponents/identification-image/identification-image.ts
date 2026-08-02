import { Component, effect, inject, input, output, signal } from '@angular/core';
import { ImageService } from '../../../../../../shared/services/image.service';
import { SnackbarService } from '../../../../../../shared/services/toast.service';
import { VerificationStatus } from '../../../../../../shared/enums/verification-status';
import { GetUserInfoDTO } from '../../../../model/profile.model';
import { ProfileService } from '../../../../service/profile.service';
import { ButtonComponent } from '../../../../../../shared/components/button/button';
import { FormField } from '../../../../../../shared/components/form-field/form-field';

@Component({
  selector: 'app-identification-image',
  standalone: true,
  imports: [ ButtonComponent],
  templateUrl: './identification-image.html',
  host: {
    class: 'space-y-sm',
  },
})
export class IdentificationImage {
  readonly userInfo = input<GetUserInfoDTO | null>(null);
  readonly croppedImage = input<Blob | null>(null);

  readonly openCropper = output<File>();
  readonly cropReset = output<void>();
  readonly profileUpdated = output<void>();

  readonly #profileService = inject(ProfileService);
  readonly #imageService = inject(ImageService);
  readonly #snackbar = inject(SnackbarService);

  // ── Section Editing Flags ─────────────────────────────────────────────────
  readonly isEditingIdImage = signal(false);

  // ── Section Loading States ────────────────────────────────────────────────
  readonly isSavingIdImage = signal(false);

  // ── File state ────────────────────────────────────────────────────────────
  #selectedIdImage: File | null = null;
  readonly idImagePreview = signal<string | null>(null);
  readonly filledIconStyle = "'FILL' 1";

  constructor() {
    effect(() => {
      const info = this.userInfo();
      if (info) {
        if (!this.isEditingIdImage()) {
          this.idImagePreview.set(info.identificationImage);
        }
      }
    });

    // Handle incoming cropped image blob
    effect(() => {
      const blob = this.croppedImage();
      if (blob) {
        const objectUrl = URL.createObjectURL(blob);
        this.idImagePreview.set(objectUrl);
        this.#selectedIdImage = new File([blob], `id-${Date.now()}.png`, { type: 'image/png' });
      }
    });
  }

  get isVerified(): boolean {
    const info = this.userInfo();
    if (!info) return false;
    return (
      info.verificationStatus === VerificationStatus.Verified || (info.role && info.role !== 'User')
    );
  }

  get isPending(): boolean {
    const info = this.userInfo();
    if (!info) return false;
    return info.verificationStatus === VerificationStatus.Pending && info.role === 'User';
  }

  get canEdit(): boolean {
    return !this.isVerified && !this.isPending;
  }

  // ── ID image: select → validate → crop ─────────────────────────────────────

  /**
   * Triggered by the (hidden) file input under the ID photo.
   * Validates type/size before opening the crop dialog.
   */
  onIdImageSelected(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    const file = inputEl.files?.[0] ?? null;
    inputEl.value = '';

    if (!file) return;

    if (!this.#imageService.validateAndToast(file)) return;

    this.openCropper.emit(file);
  }

  saveIdImage(): void {
    if (this.isSavingIdImage()) return;

    const idFile = this.#selectedIdImage;

    if (!idFile) {
      this.toggleIdImageEdit(false);
      return;
    }

    this.isSavingIdImage.set(true);

    this.#profileService.addIdImage({ identificationImage: idFile }).subscribe({
      next: () => {
        this.isSavingIdImage.set(false);
        this.toggleIdImageEdit(false);
        this.#selectedIdImage = null;
        this.cropReset.emit();
        this.#snackbar.success('تم تحديث صورة الهوية بنجاح');
        this.profileUpdated.emit();
      },
      error: (err) => {
        this.isSavingIdImage.set(false);
        const msg =
          err?.error?.message ||
          err.error?.detail ||
          'حدث خطأ أثناء رفع صورة الهوية. يرجى المحاولة مجدداً.';
        this.#snackbar.error(msg);
      },
    });
  }

  toggleIdImageEdit(edit: boolean): void {
    this.isEditingIdImage.set(edit);
  }

  cancelIdImage(): void {
    this.toggleIdImageEdit(false);
    const info = this.userInfo();
    this.idImagePreview.set(info?.identificationImage ?? null);
    this.#selectedIdImage = null;
    this.cropReset.emit();
  }
}
