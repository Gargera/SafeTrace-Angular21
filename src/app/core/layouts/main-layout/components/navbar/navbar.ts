import { Component, inject, OnInit, signal, HostListener, effect, input } from '@angular/core';
import { AuthService } from '../../../../services/auth.service';
import { Router, RouterModule } from '@angular/router';
import { NotificationService } from '../../../../services/notification.service';
import { GetUserNotificationsDTO } from '../../../../models/notification.model';
import { environment } from '../../../../../../environments/environment';
import Swal from 'sweetalert2';
import { GetUserInfoDTO } from '../../../../../features/user-profile/model/profile.model';
import { UserRole } from '../../../../../shared/enums/user-role';
import { Permissions } from '../../../../constants/Permissions';
import { HasPermissionDirective } from '../../../../../shared/directives/has-permission.directive';
import { CaseNotificationModalComponent } from '../../../../../shared/components/cases-components/case-notification-modal/case-notification-modal';

import { CacheService } from '../../../../cache/cache.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterModule, HasPermissionDirective, CaseNotificationModalComponent],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private cacheService = inject(CacheService);
  readonly notificationService = inject(NotificationService);

  onNavClick(): void {
    this.isMobileMenuOpen.set(false);
  }

  isLoggedIn = this.authService.isLoggedIn;
  currentUser = this.authService.currentUser;
  Permissions = Permissions;

  isNotificationDropdownOpen = signal(false);
  isProfileDropdownOpen = signal(false);
  isMobileMenuOpen = signal(false);

  constructor() {
    effect(() => {
      if (this.isLoggedIn()) {
        this.notificationService.startConnection();
      } else {
        this.notificationService.stopConnection();
      }
    });
  }

  ngOnInit(): void {}

  toggleNotificationDropdown(event: Event): void {
    event.stopPropagation();
    this.isNotificationDropdownOpen.update((v) => !v);
    this.isProfileDropdownOpen.set(false);
  }

  toggleProfileDropdown(event: Event): void {
    event.stopPropagation();
    this.isProfileDropdownOpen.update((v) => !v);
    this.isNotificationDropdownOpen.set(false);
  }

  toggleMobileMenu(event?: Event): void {
    if (event) event.stopPropagation();
    this.isMobileMenuOpen.update((v) => !v);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    if (!target.closest('.notification-container')) {
      this.isNotificationDropdownOpen.set(false);
    }
    if (!target.closest('.profile-container')) {
      this.isProfileDropdownOpen.set(false);
    }
    if (!target.closest('.mobile-menu-container') && !target.closest('.mobile-menu-button')) {
      this.isMobileMenuOpen.set(false);
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    if (window.innerWidth >= 768) {
      this.isMobileMenuOpen.set(false);
    }
  }

  onNotificationClick(n: GetUserNotificationsDTO): void {
    this.isNotificationDropdownOpen.set(false);
    this.notificationService.handleNotificationClick(n, this.router);
  }

  getProfileImageUrl(): string {
    const imgPath = this.currentUser()?.profileImage;
    if (!imgPath) return '';

    if (imgPath.startsWith('http://') || imgPath.startsWith('https://')) {
      return imgPath;
    }
    return `${environment.baseUrl}/${imgPath.replace(/^\//, '')}`;
  }

  canAccessDashboard(): boolean {
    return this.authService.hasPermission(this.Permissions.Cases.GetAll);
  }

  logout(): void {
    Swal.fire({
      title: 'تسجيل الخروج',
      text: 'هل أنت متأكد من رغبتك في تسجيل الخروج من منصة لقاء؟',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'نعم، سجل الخروج',
      cancelButtonText: 'إلغاء',
      confirmButtonColor: '#ba1a1a',
      cancelButtonColor: '#091426',
      background: '#ffffff',
      color: '#0b1c30',
      iconColor: '#ba1a1a',
      customClass: {
        popup: 'rounded-xl font-body-md border border-outline-variant shadow-xl',
      },
    }).then((result) => {
      if (result.isConfirmed) {
        this.authService.revokeToken().subscribe({
          next: () => {
            this.router.navigate(['/auth/login']);
          },
          error: () => {
            this.authService.clearSession();
            this.router.navigate(['/auth/login']);
          },
        });
      }
    });
  }
}
