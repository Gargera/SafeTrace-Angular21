import { Component, effect, inject, input, output, signal, OnInit, DestroyRef } from '@angular/core';
import { CacheService } from '../../../../../../core/cache/cache.service';
import { ImageService } from '../../../../../../shared/services/image.service';
import { GetUserInfoDTO } from '../../../../model/profile.model';
import { ProfileService } from '../../../../service/profile.service';
import { ButtonComponent } from '../../../../../../shared/components/button/button';
import { CardComponent } from '../../../../../../shared/components/card/card';
import { SnackbarService } from '../../../../../../shared/services/toast.service';
import { ConfirmationModalComponent } from '../../../../../../shared/components/confirmation-modal/confirmation-modal';
import { extractErrorMessage } from '../../../../../../shared/helper/case-error.helper';

@Component({
  selector: 'app-profile-image',
  standalone: true,
  imports: [ConfirmationModalComponent, ButtonComponent],
  templateUrl: './profile-image.html',
  host: {
    class: 'space-y-sm',
  },
})
export class ProfileImage implements OnInit {
  readonly userInfo = input<GetUserInfoDTO | null>(null);
  readonly croppedImage = input<Blob | null>(null);

  readonly openCropper = output<File>();
  readonly cropReset = output<void>();
  readonly profileUpdated = output<void>();

  readonly #profileService = inject(ProfileService);
  readonly #imageService = inject(ImageService);
  readonly #snackbar = inject(SnackbarService);
  readonly #cacheService = inject(CacheService);
  readonly #destroyRef = inject(DestroyRef);

  // ── Section Editing Flags ─────────────────────────────────────────────────
  readonly isEditingProfileImage = signal(false);

  // ── Section Loading States ────────────────────────────────────────────────
  readonly isUploadingProfileImage = signal(false);
  readonly isRemovingProfileImage = signal(false);
  readonly showRemoveConfirm = signal(false);

  // ── File state ────────────────────────────────────────────────────────────
  #selectedProfileImage: File | null = null;
  readonly profileImagePreview = signal<string | null>(null);

  constructor() {
    this.#destroyRef.onDestroy(() => {
      this.#cacheService.set('ProfileImage_State', {
        showRemoveConfirm: this.showRemoveConfirm()
      }, 300000);
    });
    // Sync the profile photo preview from server data, unless we're
    // mid-upload/mid-removal/mid-edit — those flows manage the preview
    // themselves (optimistic clear/preview) and would otherwise get
    // clobbered by a stale value here.
    effect(() => {
      const info = this.userInfo();
      if (info) {
        if (
          !this.isUploadingProfileImage() &&
          !this.isRemovingProfileImage() &&
          !this.isEditingProfileImage()
        ) {
          this.profileImagePreview.set(info.profileImage);
        }
      }
    });

    // Handle incoming cropped image blob
    effect(() => {
      const blob = this.croppedImage();
      if (blob) {
        const objectUrl = URL.createObjectURL(blob);
        this.profileImagePreview.set(objectUrl);
        this.#selectedProfileImage = new File([blob], `profile-${Date.now()}.png`, {
          type: 'image/png',
        });
      }
    });
  }

  ngOnInit(): void {
    const state = this.#cacheService.get<any>('ProfileImage_State');
    if (state && state.showRemoveConfirm) {
      this.showRemoveConfirm.set(true);
    }
  }

  // ── Profile photo: select → validate → crop → upload ─────────────────────

  /**
   * Triggered by the (hidden) file input under the profile photo.
   * Validates type/size before opening the crop dialog — per spec, a
   * failing file never reaches the cropper and the current photo is left
   * untouched.
   */
  onProfilePhotoFileSelected(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    const file = inputEl.files?.[0] ?? null;
    inputEl.value = '';

    if (!file) return;

    if (!this.#imageService.validateAndToast(file)) return;

    this.openCropper.emit(file);
  }

  saveProfileImage(): void {
    if (this.isUploadingProfileImage()) return;

    const profileFile = this.#selectedProfileImage;

    if (!profileFile) {
      this.toggleProfileImageEdit(false);
      return;
    }

    this.#uploadProfilePhoto(profileFile);
  }

  #uploadProfilePhoto(file: File): void {
    if (this.isUploadingProfileImage()) return;

    this.isUploadingProfileImage.set(true);

    this.#profileService.updateProfileImage({ profileImage: file }).subscribe({
      next: () => {
        this.isUploadingProfileImage.set(false);
        this.isEditingProfileImage.set(false);
        this.#selectedProfileImage = null;
        this.cropReset.emit();
        this.#snackbar.success('تم تحديث الصورة الشخصية بنجاح');
        this.profileUpdated.emit();
      },
      error: (err) => {
        this.isUploadingProfileImage.set(false);
        this.#snackbar.error(
          extractErrorMessage(err, 'حدث خطأ أثناء رفع الصورة الشخصية. يرجى المحاولة مجدداً.'),
        );
        // Fall back to whatever the server last had, since the optimistic
        // preview never actually made it to the backend. Edit mode stays
        // open so the user can pick another file or cancel.
        this.profileImagePreview.set(this.userInfo()?.profileImage ?? null);
        this.#selectedProfileImage = null;
      },
    });
  }

  // ── Profile photo: remove ─────────────────────────────────────────────────

  requestRemoveProfilePhoto(): void {
    if (!this.profileImagePreview() || this.isRemovingProfileImage()) return;
    this.showRemoveConfirm.set(true);
  }

  cancelRemoveProfilePhoto(): void {
    this.showRemoveConfirm.set(false);
  }

  confirmRemoveProfilePhoto(): void {
    if (this.isRemovingProfileImage()) return;

    this.isRemovingProfileImage.set(true);

    this.#profileService.removeProfileImage().subscribe({
      next: () => {
        this.isRemovingProfileImage.set(false);
        this.showRemoveConfirm.set(false);
        this.profileImagePreview.set(null);
        
        const cachedState = this.#cacheService.get<any>('ProfileImage_State') || {};
        cachedState.showRemoveConfirm = false;
        this.#cacheService.set('ProfileImage_State', cachedState, 300000);

        this.#snackbar.success('تم حذف الصورة الشخصية بنجاح');
        this.profileUpdated.emit();
      },
      error: (err) => {
        this.isRemovingProfileImage.set(false);
        this.#snackbar.error(
          err?.error?.message || extractErrorMessage(err, 'حدث خطأ أثناء حذف الصورة الشخصية'),
        );
      },
    });
  }

  toggleProfileImageEdit(edit: boolean): void {
    this.isEditingProfileImage.set(edit);
  }

  cancelProfileImage(): void {
    this.toggleProfileImageEdit(false);
    const info = this.userInfo();
    this.profileImagePreview.set(info?.profileImage ?? null);
    this.#selectedProfileImage = null;
    this.cropReset.emit();
  }
}
