import { Component, effect, inject, input, signal } from '@angular/core';
import { GeocodingService } from '../../../../core/services/gecoding.service';

import { GetUserInfoDTO } from '../../../../core/models/profile.model';
import { VerificationStatus } from '../../../../shared/enums/verification-status';
import { UserRole } from '../../../../shared/enums/user-role';

@Component({
  selector: 'app-profile-sidebar',
  imports: [],
  standalone: true,
  templateUrl: './profile-sidebar.html',
  styleUrl: './profile-sidebar.css',
})
export class ProfileSidebar {
  readonly userInfo = input<GetUserInfoDTO | null>(null);

  readonly VerificationStatus = VerificationStatus;

  readonly #geocodingService = inject(GeocodingService);

  /** Human-readable Arabic address resolved from lat/lng */
  readonly resolvedAddress = signal<string | null>(null);
  readonly isResolvingAddress = signal(false);

  constructor() {
    // Re-runs whenever userInfo changes — resolves the address automatically.
    effect(() => {
      const info = this.userInfo();
      console.log('userInfo changed:', info);
      console.log('Role:', this.userInfo()?.role);
      console.log('isAdmin:', this.isAdmin);

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
  get isModerator(): boolean {
    return this.userInfo()?.role === UserRole.Moderator;
  }
  get isAdmin(): boolean {
    return this.userInfo()?.role === UserRole.Admin;
  }
  get isVerified(): boolean {
    return this.userInfo()?.verificationStatus === VerificationStatus.Verified;
  }
  get hasCases(): boolean {
    return (this.userInfo()?.Cases?.length ?? 0) > 0;
  }

  get verificationLabel(): string {
    if (this.userInfo()?.role === UserRole.Moderator) {
      return 'مشرف';
    } else if (this.userInfo()?.role === UserRole.Admin) {
      return 'مسئول الننظام';
    } else if (this.userInfo()?.verificationStatus === VerificationStatus.Verified) {
      return 'حساب موثق';
    } else if (this.userInfo()?.verificationStatus === VerificationStatus.Pending) {
      return 'قيد المراجعة';
    } else {
      return 'غير موثق';
    }
  }
}
//esraataha3092001@gmail.com
// et93512@gmail.com
// Meaw_Meaw309
//liqaaplatform@gmail.com
//Liqaa_Platform_ITI_2026
