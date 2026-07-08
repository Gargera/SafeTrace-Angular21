import { Component, effect, inject, input, signal } from '@angular/core';
import { GeocodingService } from '../../../core/services/gecoding.service';

import { GetUserInfoDTO } from '../../../core/models/profile.model';
import { VerificationStatus } from '../../enums/verification-status';

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

  get isVerified(): boolean {
    return this.userInfo()?.verificationStatus == VerificationStatus.Verified;
  }

  get verificationLabel(): string {
    switch (this.userInfo()?.verificationStatus) {
      case VerificationStatus.Verified:
        return 'حساب موثق';
      case VerificationStatus.Pending:
        return 'قيد المراجعة';
      default:
        return 'غير موثق';
    }
  }
}
