import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, EMPTY, switchMap } from 'rxjs';
import { CacheService } from '../../../../core/cache/cache.service';

import { environment } from '../../../../../environments/environment';

import { AuthService } from '../../../../core/services/auth.service';
import { LongTermCaseService } from '../../services/long-term-case.service';

import { LongTermCaseDetailResponse } from '../../models/response/LongTermCaseDetailResponse';

import { HeaderComponent } from '../../../../shared/components/header/header.component';

import { GenderBadgeDirective } from '../../../../shared/directives/gender-badge-directive';
import { CaseStatusBadgeDirective } from '../../../../shared/directives/case-status-badge-directive';
import { CaseTypeBadgeDirective } from '../../../../shared/directives/case-type-badge-directive';
import { AgeBadgeDirective } from '../../../../shared/directives/age-badge-directive';

import { AgeCategories } from '../../../../shared/enums/age-categories';
import { FileType } from '../../../../shared/enums/file-type';
import { ConfirmationModalComponent } from '../../../../shared/components/confirmation-modal/confirmation-modal';
import { SnackbarService } from '../../../../shared/services/toast.service';
import { FoundedPopupComponent } from '../../../../shared/components/cases-components/founded-popup/founded-popup';
import { CasePhotoResponse, FoundPersonInfoRequest } from '../../../../core/models/cases.model';
import { CaseStatus } from '../../../../shared/enums/case-status';
import { ButtonComponent } from '../../../../shared/components/button/button';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { Permissions } from '../../../../core/constants/Permissions';

import { RejectCasePopupComponent } from '../../../../shared/components/cases-components/reject-case-popup/reject-case-popup';
import { RejectionReasonCardComponent } from '../../../../shared/components/cases-components/rejection-reason-card/rejection-reason-card';
import { extractErrorMessage } from '../../../../shared/helper/error.helper';
import { ViewProfilePopup } from '../../../../shared/components/view-profile-popup/view-profile-popup';
import { CaseDetailsSkeletonComponent } from '../../../../shared/components/skeletons/case-details-skeleton/case-details-skeleton.component';

/**
 * The backend DTO includes a `video` field (a plain path string) that is
 * separate from `photos`. The generated `LongTermCaseDetailResponse` model
 * may or may not declare it explicitly, so we widen the type locally
 * instead of touching the shared model file.
 */
type LongTermCaseDetailWithVideo = LongTermCaseDetailResponse & { video?: string | null };

/** Sentinel id used for the synthetic video media item, since the backend doesn't provide one. */
const VIDEO_MEDIA_ID = -1;

@Component({
  selector: 'app-long-term-details',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    GenderBadgeDirective,
    CaseStatusBadgeDirective,
    CaseTypeBadgeDirective,
    AgeBadgeDirective,
    ConfirmationModalComponent,
    FoundedPopupComponent,
    CaseDetailsSkeletonComponent,
    HasPermissionDirective,
    ButtonComponent,
    RejectCasePopupComponent,
    RejectionReasonCardComponent,
    ViewProfilePopup,
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
  private readonly cacheService = inject(CacheService);
  private readonly destroyRef = inject(DestroyRef);

  readonly apiUrl = environment.baseUrl;
  readonly FileType = FileType;
  readonly CaseStatus = CaseStatus;
  readonly Permissions = Permissions;

  readonly selectedUserId = signal<string | null>(null);

  openPublisherProfile(): void {
    const id = this.caseDetails()?.user?.id || (this.caseDetails() as any)?.userId;
    if (id) {
      this.selectedUserId.set(id);
    }
  }

  // Signals للـ Modals والحالات
  showDeleteConfirmation = signal(false);
  deleting = signal(false);
  showFoundedPopup = signal(false);
  isFounding = signal(false);

  showApproveConfirmation = signal(false);
  isApproving = signal(false);
  showRejectConfirmation = signal(false);
  isRejecting = signal(false);
  rejectApiError = signal<string | null>(null);
  showPermanentDeleteConfirmation = signal(false);
  isPermanentDeleting = signal(false);

  caseDetails = signal<LongTermCaseDetailWithVideo | null>(null);

  loading = signal(true);

  readonly isOwner = computed(() => {
    if (!this.authService.isLoggedIn()) return false;
    const currentUserId = this.authService.getCurrentUserId();
    const currentUserEmail = this.authService.currentUser()?.email?.toLowerCase();
    const caseOwnerId = this.caseDetails()?.user?.id || (this.caseDetails() as any)?.userId;
    const caseOwnerEmail = this.caseDetails()?.user?.email?.toLowerCase();
    if (caseOwnerId && currentUserId) {
      return caseOwnerId === currentUserId;
    }
    if (currentUserEmail && caseOwnerEmail) {
      return currentUserEmail === caseOwnerEmail;
    }
    return false;
  });

  /**
   * Unified media collection combining `photos` (images) with the single
   * `video` path returned separately by the backend. The video is wrapped
   * into a `CasePhotoResponse`-shaped object so the rest of the component
   * (and the existing HTML) can treat all media uniformly.
   * Order: all photos first, then the video appended at the end
   * (Image → Image → Video ...).
   */
  readonly mediaList = computed<CasePhotoResponse[]>(() => {
    const details = this.caseDetails();
    if (!details) return [];

    const photos: CasePhotoResponse[] = details.photos ?? [];
    const media: CasePhotoResponse[] = [...photos];

    if (details.video) {
      const videoMedia: CasePhotoResponse = {
        id: VIDEO_MEDIA_ID,
        imagePath: details.video,
        isPrimary: false,
        type: FileType.Video,
      } as CasePhotoResponse;

      media.push(videoMedia);
    }

    return media;
  });

  selectedMedia = signal<CasePhotoResponse | null>(null);

  // Lightbox
  lightboxVisible = signal(false);
  currentIndex = signal(0);
  isAdminPage = signal(false);
  isMyCasePage = signal(false);

  constructor() {}

  ngOnInit(): void {
    this.isAdminPage.set(this.route.snapshot.data['mode'] === 'dashboard');
    this.isMyCasePage.set(this.route.snapshot.data['mode'] === 'my-case');

    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const id = Number(params.get('id'));
          if (!id) {
            this.loading.set(false);
            return EMPTY;
          }

          this.loading.set(true);
          const req$ = this.isAdminPage()
            ? this.longTermCaseService.adminGetCaseById(id)
            : this.isMyCasePage()
              ? this.longTermCaseService.getMyCaseById(id)
              : this.longTermCaseService.getCaseById(id);

          return req$.pipe(
            catchError((err: unknown) => {
              this.loading.set(false);
              const errorMessage = extractErrorMessage(err, 'حدث خطأ أثناء تحميل البيانات');
              this.snackbar.error(errorMessage);
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (apiRes) => {
          if (apiRes.success && apiRes.data) {
            this.caseDetails.set(apiRes.data);

            const hasReject = this.cacheService.has(`RejectPopup_LongTerm_${apiRes.data.id}`);
            const hasFounded = this.cacheService.has(`FoundedPopup_LongTerm_${apiRes.data.id}`);

            if (hasReject) this.showRejectConfirmation.set(true);
            if (hasFounded) this.showFoundedPopup.set(true);

            const media = this.mediaList();
            if (media.length) {
              const primary = media.find((x) => x.isPrimary) ?? media[0];

              this.selectedMedia.set(primary);
              this.currentIndex.set(
                media.findIndex((x) => x.id === primary.id && x.type === primary.type),
              );
            }
          }
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

  changeMedia(media: CasePhotoResponse): void {
    this.selectedMedia.set(media);
    const index = this.mediaList().findIndex((x) => x.id === media.id && x.type === media.type);
    this.currentIndex.set(index >= 0 ? index : 0);
  }

  openLightbox(index: number): void {
    this.currentIndex.set(index);
    const media = this.mediaList()[index];
    if (media) {
      this.selectedMedia.set(media);
      this.lightboxVisible.set(true);
    }
  }

  closeLightbox(): void {
    this.lightboxVisible.set(false);
  }

  previousMedia(): void {
    const media = this.mediaList();
    if (!media.length) return;

    let index = this.currentIndex() - 1;
    if (index < 0) {
      index = media.length - 1;
    }

    this.currentIndex.set(index);
    this.selectedMedia.set(media[index]);
  }

  nextMedia(): void {
    const media = this.mediaList();
    if (!media.length) return;

    let index = this.currentIndex() + 1;
    if (index >= media.length) {
      index = 0;
    }

    this.currentIndex.set(index);
    this.selectedMedia.set(media[index]);
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
    if (this.isFounding()) return;
    const id = this.caseDetails()?.id;
    if (!id) return;

    this.isFounding.set(true);

    this.longTermCaseService
      .markAsFound(id, data)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.isFounding.set(false);
          this.showFoundedPopup.set(false);

          if (res.success) {
            this.snackbar.success('تم تحديث الحالة إلى تم العثور عليه');
            this.cacheService.remove(`FoundedPopup_LongTerm_${id}`);
            this.caseDetails.update((current) => {
              if (!current) return current;
              return {
                ...current,
                status: CaseStatus.Found,
              };
            });
          }
        },
        error: (err: unknown) => {
          this.isFounding.set(false);
          this.showFoundedPopup.set(false);
          const errorMessage = extractErrorMessage(err, 'حدث خطأ أثناء تحديث الحالة');
          this.snackbar.error(errorMessage);
        },
      });
  }

  editCase(): void {
    const id = this.caseDetails()?.id;
    if (!id) return;
    this.router.navigate(['/long-term/edit', id]);
  }

  deleteCase(): void {
    if (this.caseDetails()?.status === CaseStatus.Found) {
      this.snackbar.error('لا يمكن حذف حالة تم العثور عليها');
      return;
    }

    this.showDeleteConfirmation.set(true);
  }

  cancelDelete(): void {
    this.showDeleteConfirmation.set(false);
  }

  confirmDelete(): void {
    if (this.deleting()) return;
    const id = this.caseDetails()?.id;
    if (!id) return;

    if (this.caseDetails()?.status === CaseStatus.Found) {
      this.snackbar.error('لا يمكن حذف حالة تم العثور عليها');
      this.showDeleteConfirmation.set(false);
      return;
    }

    this.deleting.set(true);

    this.longTermCaseService
      .deleteCase(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.deleting.set(false);

          if (res.success) {
            this.showDeleteConfirmation.set(false);
            this.snackbar.success('تم حذف الحالة بنجاح');
            this.router.navigate(['/long-term']);
          } else {
            this.snackbar.error(res.message || 'حدث خطأ أثناء حذف الحالة');
          }
        },
        error: (err: unknown) => {
          this.deleting.set(false);
          const errorMessage = extractErrorMessage(err, 'حدث خطأ أثناء حذف الحالة');
          this.snackbar.error(errorMessage);
        },
      });
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
    if (this.isApproving()) return;
    const id = this.caseDetails()?.id;
    if (!id) return;

    this.isApproving.set(true);
    this.longTermCaseService
      .approveCase(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.isApproving.set(false);
          if (res.success) {
            this.showApproveConfirmation.set(false);
            this.snackbar.success('تم قبول الحالة بنجاح');
            this.refreshCaseDetails(id);
          } else {
            this.snackbar.error(res.message || 'حدث خطأ أثناء قبول الحالة');
          }
        },
        error: (err: unknown) => {
          this.isApproving.set(false);
          const errorMessage = extractErrorMessage(err, 'حدث خطأ أثناء قبول الحالة');
          this.snackbar.error(errorMessage);
        },
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
    if (this.isRejecting()) return;
    const id = this.caseDetails()?.id;
    if (!id) return;

    this.isRejecting.set(true);
    this.rejectApiError.set(null);

    this.longTermCaseService
      .rejectCase(id, reason)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.isRejecting.set(false);
          if (res.success) {
            this.showRejectConfirmation.set(false);
            this.cacheService.remove(`RejectPopup_LongTerm_${id}`);
            const successMessage = res.message || 'تم رفض الحالة بنجاح';
            this.snackbar.success(successMessage);
            this.refreshCaseDetails(id);
          } else {
            this.rejectApiError.set(res.message || 'حدث خطأ أثناء رفض الحالة');
          }
        },
        error: (err: unknown) => {
          this.isRejecting.set(false);
          const errorMessage = extractErrorMessage(err, 'حدث خطأ أثناء رفض الحالة');
          this.rejectApiError.set(errorMessage);
        },
      });
  }

  openPermanentDeleteConfirmation(): void {
    if (this.caseDetails()?.status === CaseStatus.Found) {
      this.snackbar.error('لا يمكن حذف حالة تم العثور عليها');
      return;
    }

    this.showPermanentDeleteConfirmation.set(true);
  }

  cancelPermanentDelete(): void {
    this.showPermanentDeleteConfirmation.set(false);
  }

  confirmPermanentDelete(): void {
    if (this.isPermanentDeleting()) return;
    const id = this.caseDetails()?.id;
    if (!id) return;

    if (this.caseDetails()?.status === CaseStatus.Found) {
      this.snackbar.error('لا يمكن حذف حالة تم العثور عليها');
      this.showPermanentDeleteConfirmation.set(false);
      return;
    }

    this.isPermanentDeleting.set(true);
    this.longTermCaseService
      .permanentDelete(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.isPermanentDeleting.set(false);
          if (res.success) {
            this.showPermanentDeleteConfirmation.set(false);
            this.snackbar.success('تم حذف الحالة نهائياً');
            this.router.navigate(['/admin/cases-management']);
          } else {
            this.snackbar.error(res.message || 'حدث خطأ أثناء الحذف النهائي');
          }
        },
        error: (err: unknown) => {
          this.isPermanentDeleting.set(false);
          const errorMessage = extractErrorMessage(err, 'حدث خطأ أثناء الحذف النهائي');
          this.snackbar.error(errorMessage);
        },
      });
  }

  private refreshCaseDetails(id: number): void {
    const req$ = this.isAdminPage()
      ? this.longTermCaseService.adminGetCaseById(id)
      : this.longTermCaseService.getCaseById(id);

    req$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (apiRes) => {
        if (apiRes.success && apiRes.data) {
          this.caseDetails.set(apiRes.data);
        }
      },
    });
  }

  startChat(id: number): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/auth/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    this.router.navigate(['/chat/start', id]);
  }
}
