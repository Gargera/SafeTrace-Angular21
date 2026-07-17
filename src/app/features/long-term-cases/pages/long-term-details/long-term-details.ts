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
import { ConfirmationModalComponent } from
'../../../../shared/components/confirmation-modal/confirmation-modal';
import { SnackbarService } from '../../../../core/services/toast.service';

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
showDeleteConfirmation = signal(false);
deleting = signal(false);
  caseDetails = signal<LongTermCaseDetailResponse | null>(null);

  loading = signal(true);
  isOwner = signal(false);

  selectedMedia = signal<any | null>(null);

  // Lightbox
  lightboxVisible = signal(false);
  currentIndex = signal(0);

  ngOnInit(): void {

    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!id) {
      this.loading.set(false);
      return;
    }

    this.fetchCase(id);
  }

  private fetchCase(id: number): void {

    this.loading.set(true);

    this.longTermCaseService.getCaseById(id).subscribe({

      next: (apiRes) => {

        if (apiRes.success && apiRes.data) {

          this.caseDetails.set(apiRes.data);

          const currentUserEmail =
            this.authService.currentUser()?.email?.toLowerCase();

          const caseOwnerEmail =
            apiRes.data.user?.email?.toLowerCase();

          this.isOwner.set(
            !!currentUserEmail &&
            currentUserEmail === caseOwnerEmail
          );

          if (apiRes.data.photos?.length) {

            const primary =
              apiRes.data.photos.find(x => x.isPrimary)
              ?? apiRes.data.photos[0];

            this.selectedMedia.set(primary);
            this.currentIndex.set(
              apiRes.data.photos.findIndex(x => x.id === primary.id)
            );
          }

        }

        this.loading.set(false);

      },

      error: err => {

        console.error(err);

        this.loading.set(false);

      }

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
     console.log(media);
    this.selectedMedia.set(media);

    const index =
      this.caseDetails()?.photos.findIndex(x => x.id === media.id) ?? 0;

    this.currentIndex.set(index);

  }

  openLightbox(index: number): void {

    this.currentIndex.set(index);

    const media =
      this.caseDetails()?.photos[index];

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

}

  });

}
  getAgeCategoryEnum(): AgeCategories {

    const age = this.caseDetails()?.age ?? 0;

    if (age <= 12) {
      return AgeCategories.Child;
    }

    if (age <= 24) {
      return AgeCategories.Young;
    }

    if (age <= 60) {
      return AgeCategories.Adult;
    }

    return AgeCategories.LateAdult;

  }
}