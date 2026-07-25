import { FormField } from '../../../../shared/components/form-field/form-field';
import { CardComponent } from '../../../../shared/components/card/card';
import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../core/services/auth.service';
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
import { UnknownCaseService } from '../../services/unknown-case.service';
import { UnknownCaseDetailResponse } from '../../models/response/UnknownCaseDetailResponse';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { Permissions } from '../../../../core/constants/Permissions';

import { RejectCasePopupComponent } from '../../../../shared/components/cases-components/reject-case-popup/reject-case-popup';
import { RejectionReasonCardComponent } from '../../../../shared/components/cases-components/rejection-reason-card/rejection-reason-card';

@Component({
  selector: 'app-unknown-details',
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
    HasPermissionDirective,
    ButtonComponent,
    RejectCasePopupComponent,
    RejectionReasonCardComponent,
  ],
  templateUrl: './unknown-details.html',
  styleUrls: ['./unknown-details.css'],
})
export class UnknownDetails implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly UnknownCaseService = inject(UnknownCaseService);
  private readonly snackbar = inject(SnackbarService);

  readonly apiUrl = environment.baseUrl;
  readonly FileType = FileType;
  readonly CaseStatus = CaseStatus;
  readonly Permissions = Permissions;

  // Modals signals
  showDeleteConfirmation = signal(false);
  deleting = signal(false);
  showFoundedPopup = signal(false);
  isFounding = signal(false);

  showApproveConfirmation = signal(false);
  showRejectConfirmation = signal(false);
  isRejecting = signal(false);
  rejectApiError = signal<string | null>(null);
  showPermanentDeleteConfirmation = signal(false);

  caseDetails = signal<UnknownCaseDetailResponse | null>(null);
  loading = signal(true);
  isOwner = signal(false);

  selectedMedia = signal<any | null>(null);

  // Lightbox
  lightboxVisible = signal(false);
  currentIndex = signal(0);
  isAdminPage = signal(false);

  ngOnInit(): void {
    this.route.data.subscribe(data => {
      this.isAdminPage.set(data['mode'] === 'dashboard');
    });

    this.route.paramMap.subscribe((params) => {
      const id = Number(params.get('id'));

      if (id) {
        this.fetchCase(id);
      }
    });
  }

  private fetchCase(id: number): void {
    this.loading.set(true);

    const request = this.isAdminPage()
      ? this.UnknownCaseService.adminGetCaseById(id)
      : this.UnknownCaseService.getCaseById(id);

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
        const errorMessage = err.error?.detail || err.error?.message || 'حدث خطأ أثناء تحميل البيانات';
        this.snackbar.error(errorMessage);
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
    if (!id) return;

    this.isFounding.set(true);
    this.isFounding.set(true);

    this.UnknownCaseService.markAsFound(id, data).subscribe({
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

      error: (err) => {
        this.isFounding.set(false);
        const errorMessage = err.error?.detail || err.error?.message || 'حدث خطأ أثناء تحديث الحالة';
        this.snackbar.error(errorMessage);
      },
    });
  }

  editCase(): void {
    const id = this.caseDetails()?.id;

    if (!id) return;

    this.router.navigate(['/unknown/edit', id]);
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

    this.UnknownCaseService.deleteCase(id).subscribe({
      next: (res) => {
        this.deleting.set(false);
        this.showDeleteConfirmation.set(false);

        if (res.success) {
          this.snackbar.success('تم حذف الحالة بنجاح');
          this.router.navigate(['/unknown']);
        }
      },

      error: (err) => {
        this.deleting.set(false);
        this.showDeleteConfirmation.set(false);
        const errorMessage = err.error?.detail || err.error?.message || 'حدث خطأ أثناء حذف الحالة';
        this.snackbar.error(errorMessage);
      },
    });
  }

  goToCase(id: number): void {
    if (this.isAdminPage()) {
      this.router.navigate(['/admin/unknown', id]);
    } else {
      this.router.navigate(['/unknown', id]);
    }
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
      // case 'Mid Adult':
      //   return AgeCategories.MidAdult;
      case 'Late Adult':
        return AgeCategories.LateAdult;
      default:
        return AgeCategories.Child;
    }
  }

  // --- Admin Actions with Confirmation ---
  openApproveConfirmation(): void {
    this.showApproveConfirmation.set(true);
  }

  cancelApprove(): void {
    this.showApproveConfirmation.set(false);
  }

  confirmApprove(): void {
    const id = this.caseDetails()?.id;
    if (!id) return;

    this.UnknownCaseService.approveCase(id).subscribe({
      next: (res) => {
        this.showApproveConfirmation.set(false);
        if (res.success) {
          this.snackbar.success('تم قبول الحالة بنجاح');
          this.fetchCase(id);
        }
      },
      error: (err) => {
        this.showApproveConfirmation.set(false);
        const errorMessage = err.error?.detail || err.error?.message || 'حدث خطأ أثناء قبول الحالة';
        this.snackbar.error(errorMessage);
      }
    });
  }

  openRejectConfirmation(): void {
    this.rejectApiError.set(null);
    this.showRejectConfirmation.set(true);
  }

  cancelReject(): void {
    this.showRejectConfirmation.set(false);
    this.rejectApiError.set(null);
  }

  confirmReject(reason: string): void {
    const id = this.caseDetails()?.id;
    if (!id) return;

    this.isRejecting.set(true);
    this.rejectApiError.set(null);

    this.UnknownCaseService.rejectCase(id, reason).subscribe({
      next: (res) => {
        this.isRejecting.set(false);
        if (res.success) {
          this.showRejectConfirmation.set(false);
          const successMessage = res.message || 'تم رفض الحالة بنجاح';
          this.snackbar.success(successMessage);
          this.fetchCase(id);
        } else {
          this.rejectApiError.set(res.message || 'حدث خطأ أثناء رفض الحالة');
        }
      },
      error: (err) => {
        this.isRejecting.set(false);
        const errorMessage = this.extractErrorMessage(err, 'حدث خطأ أثناء رفض الحالة');
        this.rejectApiError.set(errorMessage);
      }
    });
  }

  private extractErrorMessage(err: any, fallback: string): string {
    if (err?.error?.errors && typeof err.error.errors === 'object') {
      const messages: string[] = [];
      Object.values(err.error.errors).forEach((val: any) => {
        if (Array.isArray(val)) {
          messages.push(...val);
        } else if (typeof val === 'string') {
          messages.push(val);
        }
      });
      if (messages.length > 0) {
        return messages.join(' - ');
      }
    }
    return err?.error?.detail || err?.error?.message || (typeof err?.error === 'string' ? err.error : null) || fallback;
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

    this.UnknownCaseService.permanentDelete(id).subscribe({
      next: (res) => {
        this.showPermanentDeleteConfirmation.set(false);
        if (res.success) {
          this.snackbar.success('تم حذف الحالة نهائياً');
          this.router.navigate(['/admin/cases-management']);
        }
      },
      error: (err) => {
        this.showPermanentDeleteConfirmation.set(false);
        const errorMessage = err.error?.detail || err.error?.message || 'حدث خطأ أثناء الحذف النهائي';
        this.snackbar.error(errorMessage);
      }
    });
  }
}