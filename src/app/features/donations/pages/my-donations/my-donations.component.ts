import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DonationService } from '../../services/donations.service';
import { DonationUserListDto } from '../../models/responses/donation-user-list.dto';

import { TruncatePipe } from '../../../../shared/pipes/truncate-pipe';
import { PaymentStatusBadgeDirective } from '../../../../shared/directives/payment-status-badge.directive';
import { ButtonComponent } from '../../../../shared/components/button/button';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-my-donations',
  standalone: true,
  imports: [
    CommonModule, 
    TruncatePipe,
    PaymentStatusBadgeDirective,
    ButtonComponent,
    LoadingSpinnerComponent,
    EmptyStateComponent
  ],
  templateUrl: './my-donations.component.html',
})
export class MyDonationsComponent implements OnInit {
  private readonly donationService = inject(DonationService);

  donations = signal<DonationUserListDto[]>([]);
  loading = signal(false);
  loadingMore = signal(false);
  hasMore = signal(true);
  selectedMessage = signal<DonationUserListDto | null>(null);

  currentPage = signal(1);
  readonly pageSize = 12;
  totalPages = signal(0);

  ngOnInit(): void {
    this.load();
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const viewportHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const nearBottom = scrollTop + viewportHeight >= documentHeight - 220;

    if (nearBottom && this.hasMore() && !this.loading() && !this.loadingMore()) {
      this.loadMore();
    }
  }

  load(): void {
    this.loading.set(true);
    this.loadingMore.set(false);
    this.currentPage.set(1);
    this.hasMore.set(true);

    this.donationService.getMyDonations(1, this.pageSize).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.donations.set(res?.items ?? []);
        this.totalPages.set(res?.totalPages ?? 0);
        this.currentPage.set(res?.pageNumber ?? 1);
        this.hasMore.set((res?.pageNumber ?? 0) < (res?.totalPages ?? 0));
      },
      error: () => {
        this.loading.set(false);
        this.donations.set([]);
        this.hasMore.set(false);
      },
    });
  }

  loadMore(): void {
    if (!this.hasMore() || this.loading() || this.loadingMore()) {
      return;
    }

    this.loadingMore.set(true);
    const nextPage = this.currentPage() + 1;

    this.donationService.getMyDonations(nextPage, this.pageSize).subscribe({
      next: (res) => {
        console.log('Load more donations response:', res, nextPage);
        this.loadingMore.set(false);
        const nextItems = res?.items ?? [];

        if (nextItems.length === 0) {
          this.hasMore.set(false);
          return;
        }

        this.donations.update((current) => [...current, ...nextItems]);
        this.totalPages.set(res?.totalPages ?? 0);
        this.currentPage.set(nextPage);
        this.hasMore.set(nextPage < (res?.totalPages ?? 0));
      },
      error: () => {
        this.loadingMore.set(false);
        this.hasMore.set(false);
      },
    });
  }

  openMessage(donation: DonationUserListDto): void {
    if (!donation.message) return;
    this.selectedMessage.set(donation);
  }

  closeMessage(): void {
    this.selectedMessage.set(null);
  }
}
