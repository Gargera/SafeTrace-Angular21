import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, EMPTY, switchMap } from 'rxjs';
import { CacheService } from '../../../../core/cache/cache.service';

import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../core/services/auth.service';
import { HeaderComponent } from '../../../../shared/components/header/header.component';

import { GenderBadgeDirective } from '../../../../shared/directives/gender-badge.directive';
import { CaseStatusBadgeDirective } from '../../../../shared/directives/case-status-badge.directive';
import { CaseTypeBadgeDirective } from '../../../../shared/directives/case-type-badge.directive';
import { AgeBadgeDirective } from '../../../../shared/directives/age-badge.directive';

import { AgeCategories } from '../../../../shared/enums/age-categories';
import { FileType } from '../../../../shared/enums/file-type';
import { ConfirmationModalComponent } from '../../../../shared/components/confirmation-modal/confirmation-modal';
import { SnackbarService } from '../../../../shared/services/toast.service';
import { FoundedPopupComponent } from '../../../../shared/components/cases-components/founded-popup/founded-popup.component';
import { CasePhotoResponse, FoundPersonInfoRequest } from '../../../../core/models/cases.model';
import { CaseStatus } from '../../../../shared/enums/case-status';
import { ButtonComponent } from '../../../../shared/components/button/button';
import { UrgentCaseService } from '../../services/urgent-case.service';
import { UrgentCaseDetailResponse } from '../../models/response/UrgentCaseDetailResponse';
import { MapLocationPickerComponent } from '../../../../shared/components/map-location-picker/components/map-location-picker';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { Permissions } from '../../../../core/constants/Permissions';
import { extractErrorMessage } from '../../../../shared/helper/error.helper';
import { ViewProfilePopup } from '../../../../shared/components/view-profile-popup/view-profile-popup';
import { CaseDetailsSkeletonComponent } from '../../../../shared/components/skeletons/case-details-skeleton/case-details-skeleton.component';

@Component({
  selector: 'urgent-details',
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
    MapLocationPickerComponent,
    HasPermissionDirective,
    ButtonComponent,
    ViewProfilePopup,
    CaseDetailsSkeletonComponent,
  ],
  templateUrl: './urgent-details.html',
  styleUrls: ['./urgent-details.css'],
})
export class UrgentDetails implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly UrgentDetailsService = inject(UrgentCaseService);
  private readonly snackbar = inject(SnackbarService);
  private readonly destroyRef = inject(DestroyRef);

  readonly apiUrl = environment.baseUrl;
  private readonly cacheService = inject(CacheService);
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

  // Signals
  showDeleteConfirmation = signal(false);
  deleting = signal(false);
  showFoundedPopup = signal(false);
  isFounding = signal(false);
  showPermanentDeleteConfirmation = signal(false);
  isPermanentDeleting = signal(false);
  showLocationModal = signal(false);

  caseDetails = signal<UrgentCaseDetailResponse | null>(null);
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

  selectedMedia = signal<CasePhotoResponse | null>(null);
  isAdminPage = signal(false);
  isMyCasePage = signal(false);
  // Lightbox
  lightboxVisible = signal(false);
  currentIndex = signal(0);

  constructor() {
    // Modal states should not be cached across navigation
  }

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
            ? this.UrgentDetailsService.adminGetCaseById(id)
            : this.isMyCasePage()
              ? this.UrgentDetailsService.getMyCaseById(id)
              : this.UrgentDetailsService.getCaseById(id);

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

            const hasFounded = this.cacheService.has(`FoundedPopup_Urgent_${apiRes.data.id}`);
            if (hasFounded) this.showFoundedPopup.set(true);

            if (apiRes.data.photos?.length) {
              const primary = apiRes.data.photos.find((x) => x.isPrimary) ?? apiRes.data.photos[0];

              this.selectedMedia.set(primary);
              this.currentIndex.set(apiRes.data.photos.findIndex((x) => x.id === primary.id));
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
    return `${environment.filesBaseUrl}/${path}`;
  }

  changeMedia(media: CasePhotoResponse): void {
    this.selectedMedia.set(media);
    const index = this.caseDetails()?.photos.findIndex((x) => x.id === media.id) ?? 0;
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

  // Action Methods
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

    this.UrgentDetailsService.markAsFound(id, data)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.isFounding.set(false);
          this.showFoundedPopup.set(false);

          if (res.success) {
            this.snackbar.success('تم تحديث الحالة إلى تم العثور عليه');
            this.cacheService.remove(`FoundedPopup_Urgent_${id}`);
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

    this.router.navigate(['/urgent/edit', id]);
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

    this.UrgentDetailsService.deleteCase(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.deleting.set(false);

          if (res.success) {
            this.showDeleteConfirmation.set(false);
            this.snackbar.success('تم حذف الحالة بنجاح');
            this.router.navigate(['/urgent']);
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

  openLocationModal(): void {
    this.showLocationModal.set(true);
  }

  closeLocationModal(): void {
    this.showLocationModal.set(false);
  }

  confirmPermanentDelete(): void {
    if (this.isPermanentDeleting()) return;
    const id = this.caseDetails()?.id;
    if (!id) return;

    this.isPermanentDeleting.set(true);

    this.UrgentDetailsService.permanentDelete(id)
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

  startChat(id: number): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/auth/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    this.router.navigate(['/chat/start', id]);
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
}
