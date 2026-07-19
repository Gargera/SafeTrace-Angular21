import { NgTemplateOutlet } from '@angular/common';
import { Component, inject, input, output, signal } from '@angular/core';
import { GetUserInfoDTO } from '../../model/profile.model';
import { ProfileService } from '../../service/profile.service';

import { UserRole } from '../../../../shared/enums/user-role';
import { VerificationStatus } from '../../../../shared/enums/verification-status';
import { ConfirmDialog } from '../../shared/confirm-dialog/confirm-dialog';
import { ImageCropDialog } from '../../shared/image-crop-dialog/image-crop-dialog';
import { Toast } from '../../../../shared/components/toast/toast';
import { getRoleTranslationAr } from '../../../../core/constants/roles.dictionary';
import { getVerificationStatusTranslationAr } from '../../../../core/constants/verification.status.dictionary';
import { ViewProfilePopup } from '../../../../shared/components/view-profile-popup/view-profile-popup';
import { ImageService } from '../../service/image.service';
import { ProfileImage } from './innerComponents/profile-image/profile-image';
import { IdentificationImage } from './innerComponents/identification-image/identification-image';
import { Password } from './innerComponents/password/password';
import { Phone } from './innerComponents/phone/phone';
import { PersonalInfo } from './innerComponents/personal-info/personal-info';
import { LocationPicker } from './innerComponents/location-picker/location-picker';

@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [
    NgTemplateOutlet,
    Toast,
    ConfirmDialog,
    ImageCropDialog,
    ViewProfilePopup,
    ProfileImage,
    IdentificationImage,
    Password,
    Phone,
    PersonalInfo,
    LocationPicker,
  ],
  templateUrl: './edit-profile.html',
  styleUrl: './edit-profile.css',
})
export class EditProfile {
  readonly userInfo = input<GetUserInfoDTO | null>(null);
  readonly profileUpdated = output<GetUserInfoDTO>();
  readonly imageFile = input<File | null>(null);

  readonly #profileService = inject(ProfileService);
  readonly #imageService = inject(ImageService);

  // ── Crop dialog state (shared by profile photo + ID image) ───────────────
  readonly showCropDialog = signal(false);
  readonly cropSourceFile = signal<File | null>(null);
  // Which field the current crop session is for. The cropper itself is now
  // fully free-form and has no notion of "profile" vs "id" — this only
  // decides where onCropSaved routes the resulting Blob.
  #cropTarget: 'profile' | 'id' = 'profile';

  // Cropped images passed to child components
  readonly profileCroppedImage = signal<Blob | null>(null);
  readonly idCroppedImage = signal<Blob | null>(null);

  // ── Role / verification helpers ───────────────────────────────────────────

  get isModerator(): boolean {
    return this.userInfo()?.role === UserRole.Moderator;
  }
  get isAdmin(): boolean {
    return this.userInfo()?.role === UserRole.Admin;
  }
  get isVerified(): boolean {
    return this.userInfo()?.verificationStatus === VerificationStatus.Verified;
  }

  getRoleName(roleName: string | undefined): string {
    return getRoleTranslationAr(roleName);
  }
  getVerificationStatus(ver: string | undefined): string {
    return getVerificationStatusTranslationAr(ver);
  }
  get verificationLabel(): string {
    if (this.userInfo()?.role === UserRole.Moderator) {
      return this.getRoleName(UserRole.Moderator);
    } else if (this.userInfo()?.role === UserRole.Admin) {
      return this.getRoleName(UserRole.Admin);
    } else if (this.userInfo()?.verificationStatus === VerificationStatus.Verified) {
      return this.getVerificationStatus(VerificationStatus.Verified);
    } else if (this.userInfo()?.verificationStatus === VerificationStatus.Pending) {
      return this.getVerificationStatus(VerificationStatus.Pending);
    } else {
      return getVerificationStatusTranslationAr(VerificationStatus.Unverified);
    }
  }

  // ── Crop dialog handlers ──────────────────────────────────────────────────

  onOpenCropper(target: 'profile' | 'id', file: File): void {
    this.#cropTarget = target;
    this.cropSourceFile.set(file);
    this.showCropDialog.set(true);
  }

  onCropCancelled(): void {
    this.showCropDialog.set(false);
    this.cropSourceFile.set(null);
  }

  onCropSaved(blob: Blob): void {
    this.showCropDialog.set(false);
    this.cropSourceFile.set(null);

    if (this.#cropTarget === 'id') {
      this.idCroppedImage.set(blob);
      return;
    }

    this.profileCroppedImage.set(blob);
  }

  // ── Refresh after any child section saves ─────────────────────────────────

  onProfileUpdated(): void {
    this.#refreshAndEmit();
  }

  /**
   * None of the UserProfile endpoints return the updated profile — they
   * only return { success, message, data: true }. So after any successful
   * save we silently re-fetch GetInfo and push the fresh data up to
   * ProfileView, which is what actually keeps the sidebar/tabs in sync
   * and makes the change survive a refresh.
   */
  #refreshAndEmit(): void {
    this.#profileService.getUserInfo().subscribe({
      next: (res) => {
        if (res.data) {
          this.profileUpdated.emit(res.data);
        }
      },
      error: () => {},
    });
  }
}
