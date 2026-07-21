import { ChangeDetectionStrategy, Component, HostListener, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { SystemConstants } from '../../../../core/constants/system.constants';
import Swal from 'sweetalert2';
import { environment } from '../../../../../environments/environment';
import { ButtonComponent } from '../../../../shared/components/button/button';

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonComponent], 
  templateUrl: './overview.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Overview implements OnInit {
  public authService = inject(AuthService);
  private router = inject(Router);
  currentUser = this.authService.currentUser;
  
  isSidebarExpanded = signal<boolean>(true);

  isSuperAdmin(): boolean {
    return this.currentUser()?.email === SystemConstants.RootAdminEmail;
  }

  ngOnInit() {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      this.isSidebarExpanded.set(false);
    }
  }

  @HostListener('window:resize')
  onResize() {
    if (typeof window === 'undefined') return;

    if (window.innerWidth < 768) {
      this.isSidebarExpanded.set(false);
    } else {
      this.isSidebarExpanded.set(true);
    }
  }
  toggleSidebar() {
    this.isSidebarExpanded.update(v => !v);
  }

  getProfileImageUrl(): string {
    const imgPath = this.currentUser()?.profileImage;
    if (!imgPath) return '';

    if (imgPath.startsWith('http://') || imgPath.startsWith('https://')) {
      return imgPath;
    }
    return `${environment.baseUrl}/${imgPath.replace(/^\//, '')}`;
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