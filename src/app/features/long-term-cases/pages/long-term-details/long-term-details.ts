import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { environment } from '../../../../../environments/environment';

import { AuthService } from '../../../../core/services/auth.service';
import { LongTermCaseService } from '../../services/long-term-case.service';

import { LongTermCaseDetailResponse } from '../../models/response/LongTermCaseDetailResponse';

import { CaseHeaderComponent } from '../../../../shared/components/cases-components/case-header/case-header.component';

import { GenderBadgeDirective } from '../../../../shared/directives/gender-badge-directive';
import { CaseStatusBadgeDirective } from '../../../../shared/directives/case-status-badge-directive';
import { CaseTypeBadgeDirective } from '../../../../shared/directives/case-type-badge-directive';
import { AgeBadgeDirective } from '../../../../shared/directives/age-badge-directive';

import { AgeCategories } from '../../../../shared/enums/age-categories';
import { FileType } from '../../../../shared/enums/file-type';
import { ConfirmationModalComponent } from '../../../../shared/components/confirmation-modal/confirmation-modal';
import { SnackbarService } from '../../../../core/services/toast.service';
import { FoundedPopupComponent } from '../../../../shared/components/cases-components/founded-popup/founded-popup';
import { FoundPersonInfoRequest } from '../../../../core/models/Cases.model';
import { CaseStatus } from '../../../../shared/enums/case-status';
import { ButtonComponent } from '../../../../shared/components/button/button';

@Component({
  selector: 'app-long-term-details',
  standalone: true,
  imports: [
    CommonModule,
    CaseHeaderComponent,
    GenderBadgeDirective,
    CaseStatusBadgeDirective,
    CaseTypeBadgeDirective,
    AgeBadgeDirective,
    ConfirmationModalComponent,
    FoundedPopupComponent,
    ButtonComponent,
  ],
  templateUrl: './long-term-details.html',
  styleUrls: ['./long-term-details.css'],
})
export class LongTermDetails implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly longTermCaseService = inject(LongTermCaseService);
  private readonly snackbar = inject(SnackbarService);

  readonly apiUrl = environment.baseUrl;
  readonly FileType = FileType;
  readonly CaseStatus = CaseStatus;

  // Signals للـ Modals والحالات
  showDeleteConfirmation = signal(false);
  deleting = signal(false);
  showFoundedPopup = signal(false);
  isFounding = signal(false);

  showApproveConfirmation = signal(false);
  showRejectConfirmation = signal(false);
  showPermanentDeleteConfirmation = signal(false);

  caseDetails = signal<LongTermCaseDetailResponse | null>(null);

  loading = signal(true);
  isOwner = signal(false);

  selectedMedia = signal<any | null>(null);

  // Lightbox
  lightboxVisible = signal(false);
  currentIndex = signal(0);
  isAdminPage = signal(false);

  ngOnInit(): void {
    this.isAdminPage.set(this.router.url.startsWith('/admin'));

    this.route.paramMap.subscribe((params) => {
      const id = Number(params.get('id'));
      if (id) {
        this.fetchCase(id);
      } else {
        this.loading.set(false);
      }
    });
  }

  private fetchCase(id: number): void {
    this.loading.set(true);

    const request = this.isAdminPage()
      ? this.longTermCaseService.adminGetCaseById(id)
      : this.longTermCaseService.getCaseById(id);

    request.subscribe({
      next: (apiRes) => {
        if (apiRes.success && apiRes.data) {
          this.caseDetails.set(apiRes.data);

          const currentUserEmail = this.authService.currentUser()?.email?.toLowerCase();
          const caseOwnerEmail = apiRes.data.user?.email?.toLowerCase();

          this.isOwner.set(
            !!currentUserEmail && currentUserEmail === caseOwnerEmail
          );

          if (apiRes.data.photos?.length) {
            const primary =
              apiRes.data.photos.find((x) => x.isPrimary) ?? apiRes.data.photos[0];

            this.selectedMedia.set(primary);

            this.currentIndex.set(
              apiRes.data.photos.findIndex((x) => x.id === primary.id)
            );
          }
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.loading.set(false);
      },
    });
  }

  getImageUrl(path?: string): string {
    if (!path) {
      return 'assets/images/no-image.png';
    }
    if (path.startsWith('http')) {
      return path;
    }
    return `${this.apiUrl}${path}`;
  }

  changeMedia(media: any): void {
    this.selectedMedia.set(media);
    const index =
      this.caseDetails()?.photos.findIndex((x) => x.id === media.id) ?? 0;
    this.currentIndex.set(index);
  }

  openLightbox(index: number): void {
    this.currentIndex.set(index);
    const media = this.caseDetails()?.photos[index];
    if (media) {
      this.selectedMedia.set(media);
      this.lightboxVisible.set(true);
    }
  }

  closeLightbox(): void {
    this.lightboxVisible.set(false);
  }

  previousMedia(): void {
    const photos = this.caseDetails()?.photos;
    if (!photos?.length) return;

    let index = this.currentIndex() - 1;
    if (index < 0) {
      index = photos.length - 1;
    }

    this.currentIndex.set(index);
    this.selectedMedia.set(photos[index]);
  }

  nextMedia(): void {
    const photos = this.caseDetails()?.photos;
    if (!photos?.length) return;

    let index = this.currentIndex() + 1;
    if (index >= photos.length) {
      index = 0;
    }

    this.currentIndex.set(index);
    this.selectedMedia.set(photos[index]);
  }

  // --- Actions ---
  openFoundedPopup(): void {
    if (!this.caseDetails()?.id) return;
    this.showFoundedPopup.set(true);
  }

  cancelFounded(): void {
    this.showFoundedPopup.set(false);
  }

  confirmFounded(data: FoundPersonInfoRequest): void {
    const id = this.caseDetails()?.id;
    if (!id) return;

    this.isFounding.set(true);

    this.longTermCaseService.markAsFound(id, data).subscribe({
      next: (res) => {
        this.isFounding.set(false);
        this.showFoundedPopup.set(false);

        if (res.success) {
          this.snackbar.success('تم تحديث الحالة إلى تم العثور عليه');
          this.caseDetails.update((current) => {
            if (!current) return current;
            return {
              ...current,
              status: CaseStatus.Found,
            };
          });
        }
      },
      error: () => {
        this.isFounding.set(false);
        this.showFoundedPopup.set(false);
        this.snackbar.error('حدث خطأ أثناء تحديث الحالة');
      },
    });
  }

  editCase(): void {
    const id = this.caseDetails()?.id;
    if (!id) return;
    this.router.navigate(['/long-term/edit', id]);
  }

  deleteCase(): void {
    this.showDeleteConfirmation.set(true);
  }

  cancelDelete(): void {
    this.showDeleteConfirmation.set(false);
  }

  confirmDelete(): void {
    const id = this.caseDetails()?.id;
    if (!id) return;

    this.deleting.set(true);

    this.longTermCaseService.deleteCase(id).subscribe({
      next: (res) => {
        this.deleting.set(false);
        this.showDeleteConfirmation.set(false);

        if (res.success) {
          this.snackbar.success('تم حذف الحالة بنجاح');
          this.router.navigate(['/long-term']);
        }
      },
      error: () => {
        this.deleting.set(false);
        this.showDeleteConfirmation.set(false);
        this.snackbar.error('حدث خطأ أثناء حذف الحالة');
      },
    });
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  isModerator(): boolean {
    return this.authService.isModerator();
  }

  getAgeCategoryEnum(): AgeCategories {
    switch (this.caseDetails()?.ageCategory?.name) {
      case 'Toddler':
        return AgeCategories.Toddler;
      case 'Child':
        return AgeCategories.Child;
      case 'Teenager':
        return AgeCategories.Teenager;
      case 'Young':
        return AgeCategories.Young;
      case 'Adult':
        return AgeCategories.Adult;
      case 'Mid Adult':
        return AgeCategories.MidAdult;
      case 'Late Adult':
        return AgeCategories.LateAdult;
      default:
        return AgeCategories.Child;
    }
  }

  // --- Admin Action Confirmations ---
  openApproveConfirmation(): void {
    this.showApproveConfirmation.set(true);
  }

  cancelApprove(): void {
    this.showApproveConfirmation.set(false);
  }

  confirmApprove(): void {
    const id = this.caseDetails()?.id;
    if (!id) return;

    this.longTermCaseService.approveCase(id).subscribe({
      next: (res) => {
        this.showApproveConfirmation.set(false);
        if (res.success) {
          this.snackbar.success('تم قبول الحالة بنجاح');
          this.fetchCase(id);
        }
      },
      error: () => {
        this.showApproveConfirmation.set(false);
        this.snackbar.error('حدث خطأ أثناء قبول الحالة');
      },
    });
  }

  openRejectConfirmation(): void {
    this.showRejectConfirmation.set(true);
  }

  cancelReject(): void {
    this.showRejectConfirmation.set(false);
  }

  confirmReject(): void {
    const id = this.caseDetails()?.id;
    if (!id) return;

    this.longTermCaseService.rejectCase(id).subscribe({
      next: (res) => {
        this.showRejectConfirmation.set(false);
        if (res.success) {
          this.snackbar.success('تم رفض الحالة');
          this.fetchCase(id);
        }
      },
      error: () => {
        this.showRejectConfirmation.set(false);
        this.snackbar.error('حدث خطأ أثناء رفض الحالة');
      },
    });
  }

  openPermanentDeleteConfirmation(): void {
    this.showPermanentDeleteConfirmation.set(true);
  }

  cancelPermanentDelete(): void {
    this.showPermanentDeleteConfirmation.set(false);
  }

  confirmPermanentDelete(): void {
    const id = this.caseDetails()?.id;
    if (!id) return;

    this.longTermCaseService.permanentDelete(id).subscribe({
      next: (res) => {
        this.showPermanentDeleteConfirmation.set(false);
        if (res.success) {
          this.snackbar.success('تم حذف الحالة نهائياً');
          this.router.navigate(['/long-term']);
        }
      },
      error: () => {
        this.showPermanentDeleteConfirmation.set(false);
        this.snackbar.error('حدث خطأ أثناء الحذف النهائي');
      },
    });
  }
}