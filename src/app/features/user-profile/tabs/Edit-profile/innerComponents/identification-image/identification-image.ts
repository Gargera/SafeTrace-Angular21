import { Component, effect, inject, input, output, signal } from '@angular/core';
import { ImageService } from '../../../../../../shared/services/image.service';
import { SnackbarService } from '../../../../../../shared/services/toast.service';
import { VerificationStatus } from '../../../../../../shared/enums/verification-status';
import { GetUserInfoDTO } from '../../../../model/profile.model';
import { ProfileService } from '../../../../service/profile.service';
import { ButtonComponent } from '../../../../../../shared/components/button/button';

@Component({
  selector: 'app-identification-image',
  standalone: true,
  imports: [ButtonComponent],
  templateUrl: './identification-image.html',
  host: {
    class: 'space-y-sm',
  },
})
export class IdentificationImage {
  readonly userInfo = input<GetUserInfoDTO | null>(null);
  
  readonly croppedFrontImage = input<Blob | null>(null);
  readonly croppedBackImage = input<Blob | null>(null);

  readonly openCropperFront = output<File>();
  readonly openCropperBack = output<File>();
  
  readonly cropResetFront = output<void>();
  readonly cropResetBack = output<void>();
  
  readonly profileUpdated = output<void>();

  readonly #profileService = inject(ProfileService);
  readonly #imageService = inject(ImageService);
  readonly #snackbar = inject(SnackbarService);

  readonly isEditingIdImage = signal(false);
  readonly isSavingIdImage = signal(false);

  #selectedIdImageFront: File | null = null;
  #selectedIdImageBack: File | null = null;
  
  readonly idImageFrontPreview = signal<string | null>(null);
  readonly idImageBackPreview = signal<string | null>(null);

  constructor() {
    effect(() => {
      const info = this.userInfo();
      if (info) {
        if (!this.isEditingIdImage()) {
          this.idImageFrontPreview.set(info.identificationImageFront);
          this.idImageBackPreview.set(info.identificationImageBack);
        }
      }
    });

    effect(() => {
      const blob = this.croppedFrontImage();
      if (blob) {
        const objectUrl = URL.createObjectURL(blob);
        this.idImageFrontPreview.set(objectUrl);
        this.#selectedIdImageFront = new File([blob], `id-front-${Date.now()}.png`, { type: 'image/png' });
      }
    });

    effect(() => {
      const blob = this.croppedBackImage();
      if (blob) {
        const objectUrl = URL.createObjectURL(blob);
        this.idImageBackPreview.set(objectUrl);
        this.#selectedIdImageBack = new File([blob], `id-back-${Date.now()}.png`, { type: 'image/png' });
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

  onIdImageFrontSelected(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    const file = inputEl.files?.[0] ?? null;
    inputEl.value = '';
    if (!file) return;
    if (!this.#imageService.validateAndToast(file)) return;
    this.openCropperFront.emit(file);
  }

  onIdImageBackSelected(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    const file = inputEl.files?.[0] ?? null;
    inputEl.value = '';
    if (!file) return;
    if (!this.#imageService.validateAndToast(file)) return;
    this.openCropperBack.emit(file);
  }

  saveIdImage(): void {
    if (this.isSavingIdImage()) return;

    const idFileFront = this.#selectedIdImageFront;
    const idFileBack = this.#selectedIdImageBack;

    if (!idFileFront || !idFileBack) {
        this.#snackbar.error('يرجى اختيار صورة الوجه الأمامي والخلفي للبطاقة.');
        return;
    }

    this.isSavingIdImage.set(true);

    this.#profileService.addIdImage({ identificationImageFront: idFileFront, identificationImageBack: idFileBack }).subscribe({
      next: () => {
        this.isSavingIdImage.set(false);
        this.toggleIdImageEdit(false);
        this.#selectedIdImageFront = null;
        this.#selectedIdImageBack = null;
        this.cropResetFront.emit();
        this.cropResetBack.emit();
        this.#snackbar.success('تم تحديث صور الهوية بنجاح');
        this.profileUpdated.emit();
      },
      error: (err) => {
        this.isSavingIdImage.set(false);
        const msg =
          err?.error?.message ||
          err.error?.detail ||
          'حدث خطأ أثناء رفع صور الهوية. يرجى المحاولة مرة أخرى.';
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
    this.idImageFrontPreview.set(info?.identificationImageFront ?? null);
    this.idImageBackPreview.set(info?.identificationImageBack ?? null);
    this.#selectedIdImageFront = null;
    this.#selectedIdImageBack = null;
    this.cropResetFront.emit();
    this.cropResetBack.emit();
  }
}
