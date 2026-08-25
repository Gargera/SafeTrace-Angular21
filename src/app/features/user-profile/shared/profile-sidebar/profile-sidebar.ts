import { Component, effect, inject, input, signal } from '@angular/core';
import { GetUserInfoDTO } from '../../model/profile.model';
import { VerificationStatus } from '../../../../shared/enums/verification-status';
import { UserRole } from '../../../../shared/enums/user-role';
import { RoleBadgeDirective } from '../../../../shared/directives/role-badge.directive';
import { VerificationBadgeDirective } from '../../../../shared/directives/verification-badge.directive';
import { GeocodingService } from '../../../../core/services/geocoding.service';

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

  get hasCases(): boolean {
    return (this.userInfo()?.cases?.length ?? 0) > 0;
  }

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
//03e5f5a3-4539-41a3-bb95-67f6723bd918