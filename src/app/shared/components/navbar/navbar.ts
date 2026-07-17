import { Component, inject, OnInit, signal, HostListener, effect, input } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { Router, RouterModule } from '@angular/router';
import { NotificationService } from '../../../core/services/notification.service';
import { GetUserNotificationsDTO } from '../../../core/models/notification.model';
import { environment } from '../../../../environments/environment';
import Swal from 'sweetalert2';
import { GetUserInfoDTO } from '../../../features/user-profile/model/profile.model';
import { UserRole } from '../../enums/user-role';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  readonly notificationService = inject(NotificationService);

  isLoggedIn = this.authService.isLoggedIn;
  currentUser = this.authService.currentUser;

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
    if (!n.isRead) {
      this.notificationService.markAsRead(n.id);
    }

    if (!n.notificationDirectLink) return;

    this.isNotificationDropdownOpen.set(false);

    if (
      n.notificationDirectLink.startsWith('http://') ||
      n.notificationDirectLink.startsWith('https://')
    ) {
      window.open(n.notificationDirectLink, '_blank');
    } else {
      this.router.navigateByUrl(n.notificationDirectLink);
    }
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
    return this.authService.isAdmin() || this.authService.isModerator();
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
        this.authService.clearSession();
        this.router.navigate(['/auth']);
        this.authService.revokeToken().subscribe({
          next: () => {},
          error: () => {},
        });
      }
    });
  }
}
