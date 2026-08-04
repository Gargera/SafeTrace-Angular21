import { NgTemplateOutlet } from '@angular/common';
import { Component, inject, input, output, signal } from '@angular/core';
import { UpdateCurrentLocationDTO } from '../../model/profile.model';
import { isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  ElementRef,
  OnChanges,
  OnDestroy,
  PLATFORM_ID,
  SimpleChanges,
  ViewChild,
  effect,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Subject, switchMap, takeUntil } from 'rxjs';
import {
  ChangePasswordDTO,
  GetUserInfoDTO,
  UpdateHomeLocationDTO,
  UpdateNameDTO,
} from '../../model/profile.model';
// import { GeocodingService } from '../../../../core/services/geocoding.service';
import { ProfileService } from '../../service/profile.service';

import { UserRole } from '../../../../shared/enums/user-role';
import { VerificationStatus } from '../../../../shared/enums/verification-status';
import { ConfirmDialog } from '../../shared/confirm-dialog/confirm-dialog';
import { ImageCropDialog } from '../../shared/image-crop-dialog/image-crop-dialog';
import { Toast } from '../../../../shared/components/toast/toast';
import { getRoleTranslationAr } from '../../../../core/constants/dictionaries/roles.dictionary';
import { getVerificationStatusTranslationAr } from '../../../../core/constants/dictionaries/verification.status.dictionary';
import { ViewProfilePopup } from '../../../../shared/components/view-profile-popup/view-profile-popup';
import { ImageService } from '../../../../shared/services/image.service';
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
    ImageCropDialog,
    ProfileImage,
    IdentificationImage,
    Password,
    Phone,
    PersonalInfo,
    LocationPicker,
  ],
  templateUrl: './edit-profile.html',
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
  #cropTarget: 'profile' | 'idFront' | 'idBack' = 'profile';

  // Cropped images passed to child components
  readonly profileCroppedImage = signal<Blob | null>(null);
  readonly idFrontCroppedImage = signal<Blob | null>(null);
    readonly idBackCroppedImage = signal<Blob | null>(null);

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

  // Generic Banner Properties
  get bannerClasses(): string {
    const role = this.userInfo()?.role;
    if (role === UserRole.SuperAdmin) {
      return 'bg-linear-to-r from-red-600 via-rose-600 to-pink-600 rounded-2xl p-6 text-white shadow-lg border border-red-500';
    } else if (role === UserRole.Admin) {
      return 'bg-linear-to-r from-blue-600 via-indigo-600 to-violet-600 rounded-2xl p-6 text-white shadow-lg border border-blue-500';
    } else if (role === UserRole.User) {
      return 'bg-linear-to-r from-slate-600 via-gray-600 to-zinc-600 rounded-2xl p-6 text-white shadow-lg border border-slate-500';
    } else if (role === UserRole.VerifiedUser) {
      return 'bg-linear-to-r from-violet-600 via-purple-600 to-fuchsia-600 rounded-2xl p-6 text-white shadow-lg border border-violet-500';
    } else {
      // Moderator and any new future roles
      return 'bg-linear-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-2xl p-6 text-white shadow-lg border border-emerald-500';
    }
  }

  get displayRoleName(): string {
    const role = this.userInfo()?.role;
    return this.getRoleName(role);
  }

  get roleDescription(): string {
    const role = this.userInfo()?.role;
    if (role === UserRole.SuperAdmin) {
      return 'هذا الحساب محمي ويمتلك كافة الصلاحيات الخاصة بمدير النظام.';
    } else if (role === UserRole.Admin) {
      return 'هذا الحساب يمتلك صلاحيات الإدارة للتحكم في أجزاء النظام.';
    } else if (role === UserRole.Moderator) {
      return 'هذا الحساب يمتلك صلاحيات الإشراف ومتابعة المحتوى.';
    } else if (role === UserRole.VerifiedUser) {
      return 'هذا الحساب موثق رسمياً. توثيق حسابك يعزز من مصداقيتك وأمانك على المنصة ويمنحك موثوقية أعلى.';
    } else if (role === UserRole.User) {
      return 'هذا حساب مستخدم غير موثق. يرجى المبادرة بتوثيق حسابك للاستفادة من مميزات أعلى وإثبات هويتك.';
    } else {
      // Future role
      return `هذا الحساب يمثل ${this.getRoleName(role)} في النظام ويمتلك الصلاحيات المخصصة له.`;
    }
  }

  get roleIcon(): string {
    const role = this.userInfo()?.role;
    if (role === UserRole.SuperAdmin) return 'shield_person';
    if (role === UserRole.Admin) return 'admin_panel_settings';
    if (role === UserRole.Moderator) return 'gavel';
    if (role === UserRole.VerifiedUser) return 'verified_user';
    return 'person';
  }

  get securityLevelLabel(): string {
    const role = this.userInfo()?.role;
    if (role === UserRole.SuperAdmin || role === UserRole.Admin) return 'حساب محمي';
    if (
      role === UserRole.Moderator ||
      (role && role !== UserRole.User && role !== UserRole.VerifiedUser)
    )
      return 'حساب إشرافي';
    if (role === UserRole.VerifiedUser) return 'حساب موثوق';
    return 'حساب أساسي';
  }

  // ── Crop dialog handlers ──────────────────────────────────────────────────

  onOpenCropper(target: 'profile' | 'idFront' | 'idBack', file: File): void {
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

    if (this.#cropTarget === 'idFront') {
      this.idFrontCroppedImage.set(blob);
      return;
    }
    if (this.#cropTarget === 'idBack') {
      this.idBackCroppedImage.set(blob);
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

