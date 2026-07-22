import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { VerificationStatus } from '../../shared/enums/verification-status';
import { UrgentCaseService } from '../../features/urgent-cases/services/urgent-case.service';
import { firstValueFrom } from 'rxjs';
import { CaseType } from '../../shared/enums/case-type';

export enum CreateCaseDialogType {
  NotVerified = 'NotVerified',
  Pending = 'Pending',
  UrgentWarning = 'UrgentWarning',
  UrgentCooldown = 'UrgentCooldown'
}

@Injectable({
  providedIn: 'root'
})
export class CaseCreationFlowService {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly urgentCaseService = inject(UrgentCaseService);

  readonly dialogState = signal<CreateCaseDialogType | null>(null);
  readonly dialogData = signal<any>(null);

  private readonly urgentWarningKey = 'urgent_warning_acknowledged';

  async start(caseType: CaseType): Promise<void> {
    const route = this.getRouteForCaseType(caseType);
    if (!route) return;

    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/auth/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }

    if (caseType === CaseType.Unknown || caseType === CaseType.LongTerm) {
      const verificationStatus = this.authService.getVerificationStatus();

      if (verificationStatus === VerificationStatus.Verified) {
        this.router.navigate([route]);
      } else if (verificationStatus === VerificationStatus.Pending) {
        this.dialogState.set(CreateCaseDialogType.Pending);
      } else {
        // Unverified or Rejected
        this.dialogState.set(CreateCaseDialogType.NotVerified);
      }
      return;
    }

    if (caseType === CaseType.Urgent) {
      try {
        const res = await firstValueFrom(this.urgentCaseService.getCreationStatus());
        if (res.success && res.data) {
          if (!res.data.isAllowed) {
            this.dialogData.set({ remainingMinutes: res.data.remainingMinutes });
            this.dialogState.set(CreateCaseDialogType.UrgentCooldown);
            return;
          }
        }
      } catch (e) {
        // Fallback if API fails: proceed anyway or we can show an error toast.
        // We'll proceed to the warning check.
      }

      const warningAck = localStorage.getItem(this.urgentWarningKey);
      if (warningAck) {
        const ackDate = new Date(warningAck);
        const daysDiff = (new Date().getTime() - ackDate.getTime()) / (1000 * 3600 * 24);
        if (daysDiff < 14) {
          // Warning acknowledged within 14 days, navigate directly
          this.router.navigate([route]);
          return;
        }
      }

      // Show warning
      this.dialogState.set(CreateCaseDialogType.UrgentWarning);
    }
  }

  acknowledgeUrgentWarningAndNavigate(): void {
    localStorage.setItem(this.urgentWarningKey, new Date().toISOString());
    this.dialogState.set(null);
    this.router.navigate([this.getRouteForCaseType(CaseType.Urgent)]);
  }

  closeDialog(): void {
    this.dialogState.set(null);
    this.dialogData.set(null);
  }

  navigateToVerification(): void {
    this.closeDialog();
    this.router.navigate(['/profile']);
  }

  private getRouteForCaseType(caseType: CaseType): string | null {
    switch (caseType) {
      case CaseType.Unknown: return '/unknown/create';
      case CaseType.LongTerm: return '/long-term/create';
      case CaseType.Urgent: return '/urgent/create';
      default: return null;
    }
  }

  formatRemainingTime(totalMinutes: number | undefined): string {
    if (!totalMinutes) return 'غير معروف';

    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const minutes = totalMinutes % 60;

    let parts = [];
    if (days > 0) {
      parts.push(`${days} أيام`);
    }
    if (hours > 0) {
      parts.push(`${hours} ساعة`);
    }
    if (minutes > 0 && days === 0) {
      parts.push(`${minutes} دقيقة`);
    }

    return parts.join(' و ');
  }
}
