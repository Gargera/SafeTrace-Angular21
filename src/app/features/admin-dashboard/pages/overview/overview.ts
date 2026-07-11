import { ChangeDetectionStrategy, Component, HostListener, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import Swal from 'sweetalert2';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [CommonModule, RouterModule], 
  templateUrl: './overview.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Overview implements OnInit {
  public authService = inject(AuthService);
  private router = inject(Router);
  currentUser = this.authService.currentUser;
  
  isCasesDropdownOpen = signal<boolean>(false);
  
  isSidebarExpanded = signal<boolean>(true);

  ngOnInit() {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      this.isSidebarExpanded.set(false);
    }
  }

  @HostListener('window:resize')
  onResize() {
    if (typeof window !== 'undefined' && window.innerWidth < 768 && this.isSidebarExpanded()) {
      this.isSidebarExpanded.set(false);
    }
  }
  
  handleDropdownClick() {
    if (!this.isSidebarExpanded()) {
      this.isSidebarExpanded.set(true);
      this.isCasesDropdownOpen.set(true);
    } else {
      this.isCasesDropdownOpen.update(v => !v);
    }
  }

  toggleSidebar() {
    this.isSidebarExpanded.update(v => !v);
    if (!this.isSidebarExpanded()) {
      this.isCasesDropdownOpen.set(false);
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
          next: () => this.router.navigate(['/auth']),
          error: () => {
            this.authService.clearSession();
            this.router.navigate(['/auth']);
          },
        });
      }
    });
  }
}