import { Component, effect, inject, input, signal } from '@angular/core';
import { GeocodingService } from '../../../../core/services/geocoding.service';
import { GetUserInfoDTO } from '../../model/profile.model';
import { VerificationStatus } from '../../../../shared/enums/verification-status';
import { UserRole } from '../../../../shared/enums/user-role';
import { getRoleTranslationAr } from '../../../../core/constants/roles.dictionary';
import { getVerificationStatusTranslationAr } from '../../../../core/constants/verification.status.dictionary';
import { environment } from '../../../../../environments/environment.development';
import { RoleBadgeDirective } from '../../../../shared/directives/role-badge-directive';
import { VerificationBadgeDirective } from '../../../../shared/directives/verification-badge-directive';

@Component({
  selector: 'app-profile-sidebar',
  imports: [RoleBadgeDirective, VerificationBadgeDirective],
  standalone: true,
  templateUrl: './profile-sidebar.html',
})
export class ProfileSidebar {
  readonly userInfo = input<GetUserInfoDTO | null>(null);

  readonly VerificationStatus = VerificationStatus;

  readonly #geocodingService = inject(GeocodingService);

  /** Human-readable Arabic address resolved from lat/lng */
  readonly resolvedAddress = signal<string | null>(null);
  readonly isResolvingAddress = signal(false);
  selectedZoomImage = signal<string | null>(null);
  readonly UserRole = UserRole;
  readonly VerifiStatus = VerificationStatus;

  constructor() {
    // Re-runs whenever userInfo changes — resolves the address automatically.
    effect(() => {
      const info = this.userInfo();
      if (info?.homeLatitude && info?.homeLongitude) {
        this.isResolvingAddress.set(true);
        this.#geocodingService.reverseGeocode(info.homeLatitude, info.homeLongitude).subscribe({
          next: (address) => {
            this.resolvedAddress.set(address);
            this.isResolvingAddress.set(false);
          },
          error: () => {
            this.resolvedAddress.set('تعذر تحميل العنوان');
            this.isResolvingAddress.set(false);
          },
        });
      } else {
        this.resolvedAddress.set(null);
      }
    });
  }

  get avatarUrl(): string {
    const img = this.userInfo()?.profileImage;
    if (img) return img;
    const name = this.userInfo()?.fullName ?? 'User';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0058be&color=fff`;
  }

  // getImageUrl(path: string | undefined): string {
  //   if (!path) return '';
  //   return path.startsWith('http') ? path : `${environment.baseUrl}/${path.replace(/^\//, '')}`;
  // }

  // get isModerator(): boolean {
  //   return this.userInfo()?.role === UserRole.Moderator;
  // }
  // get isAdmin(): boolean {
  //   return this.userInfo()?.role === UserRole.Admin;
  // }
  // get isVerified(): boolean {
  //   return this.userInfo()?.verificationStatus === VerificationStatus.Verified;
  // }
  get hasCases(): boolean {
    return (this.userInfo()?.cases?.length ?? 0) > 0;
  }

  // getRoleName(roleName: string | undefined): string {
  //   return getRoleTranslationAr(roleName);
  // }
  // getVerificationStatus(ver: string | undefined): string {
  //   return getVerificationStatusTranslationAr(ver);
  // }

  // get verificationLabel(): string {
  //   if (this.userInfo()?.role === UserRole.Moderator) {
  //     return this.getRoleName(UserRole.Moderator);
  //   } else if (this.userInfo()?.role === UserRole.Admin) {
  //     return this.getRoleName(UserRole.Admin);
  //   } else if (this.userInfo()?.verificationStatus === VerificationStatus.Verified) {
  //     return this.getVerificationStatus(VerificationStatus.Verified);
  //   } else if (this.userInfo()?.verificationStatus === VerificationStatus.Pending) {
  //     return this.getVerificationStatus(VerificationStatus.Pending);
  //   } else {
  //     return getVerificationStatusTranslationAr(VerificationStatus.Unverified);
  //   }
  // }
  openImageZoom() {
    this.selectedZoomImage.set(this.avatarUrl);
    document.body.style.overflow = 'hidden';
  }

  closeImageZoom() {
    this.selectedZoomImage.set(null);
    document.body.style.overflow = '';
  }
}
//esraataha3092001@gmail.com
// et93512@gmail.com
// Meaw_Meaw309
//liqaaplatform@gmail.com
//Liqaa_Platform_ITI_2026
