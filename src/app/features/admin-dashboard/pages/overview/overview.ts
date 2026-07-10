import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import Swal from 'sweetalert2';
@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './overview.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Overview {
  public authService = inject(AuthService);
  private router = inject(Router);
  currentUser = this.authService.currentUser;
  
  isCasesDropdownOpen = signal<boolean>(false);

  toggleCasesDropdown() {
    this.isCasesDropdownOpen.update(v => !v);
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