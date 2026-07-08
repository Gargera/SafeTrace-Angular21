import { Component, inject, OnInit, signal, HostListener, effect } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { Router, RouterModule } from '@angular/router';
import { NotificationService } from '../../../core/services/notification.service';
import { GetUserNotificationsDTO } from '../../../core/models/notification.model';
import { environment } from '../../../../environments/environment.development'; // تأكدي من مسار الـ environment الصحيح
import Swal from 'sweetalert2';

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

  constructor() {
    effect(() => {
      if (this.isLoggedIn()) {
        this.notificationService.startConnection();
      } else {
        this.notificationService.stopConnection();
      }
    });
  }

  toggleNotificationDropdown(event: Event): void {
    event.stopPropagation();
    this.isNotificationDropdownOpen.update((v) => !v);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.notification-container')) {
      this.isNotificationDropdownOpen.set(false);
    }
  }

  onNotificationClick(n: GetUserNotificationsDTO): void {
    if (!n.isRead) {
      this.notificationService.markAsRead(n.id);
    }

    if (!n.notificationDirectLink) {
      return;
    }

    this.isNotificationDropdownOpen.set(false);

    if (
      n.notificationDirectLink.startsWith('http://') ||
      n.notificationDirectLink.startsWith('https://')
    ) {
      window.open(n.notificationDirectLink, '_blank');
      // أو:
      // window.location.href = n.notificationDirectLink;
    } else {
      this.router.navigateByUrl(n.notificationDirectLink);
    }
  }

  ngOnInit(): void {}

  getProfileImageUrl(): string {
    const imgPath = this.currentUser()?.profileImage;
    if (!imgPath) return '';

    if (imgPath.startsWith('http://') || imgPath.startsWith('https://')) {
      return imgPath;
    }

    return `${environment.baseUrl}/${imgPath.replace(/^\//, '')}`;
  }

  isAdmin(): boolean {
    const token = this.authService.getToken();
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const roleClaim =
        payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || payload.role;
      return roleClaim === 'Admin' || (Array.isArray(roleClaim) && roleClaim.includes('Admin'));
    } catch {
      return false;
    }
  }

  logout(): void {
    Swal.fire({
      title: 'تسجيل الخروج',
      text: 'هل أنت متأكد من رغبتك في تسجيل الخروج من SafeTrace؟',
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
            this.router.navigate(['/auth']);
          },
          error: () => {
            this.authService.clearSession();
            this.router.navigate(['/auth']);
          },
        });
      }
    });
  }
}
