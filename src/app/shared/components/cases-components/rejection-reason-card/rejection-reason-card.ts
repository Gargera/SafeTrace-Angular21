import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CaseStatus } from '../../../enums/case-status';

@Component({
  selector: 'app-rejection-reason-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rejection-reason-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RejectionReasonCardComponent {
  isOwner = input(false);
  isAdmin = input(false);
  status = input<CaseStatus>();
  rejectionReason = input<string | null | undefined>();

  readonly hasReason = computed(() => {
    const reason = this.rejectionReason();
    return !!(reason && reason.trim().length > 0);
  });

  readonly isRejectedStatus = computed(() => this.status() === CaseStatus.Rejected);

  readonly shouldShowOwnerView = computed(() => {
    return this.isOwner() && this.isRejectedStatus() && this.hasReason();
  });

  readonly shouldShowAdminView = computed(() => {
    return this.isAdmin() && this.hasReason();
  });
}
