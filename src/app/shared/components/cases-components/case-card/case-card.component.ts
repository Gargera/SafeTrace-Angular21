// case-card.component.ts
import { ChangeDetectionStrategy, Component, input, inject, output, signal, computed } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

import { CaseListItemResponse } from '../../../../core/models/cases.model';
import { getAgeCategory } from '../../../helper/age-category.helper';

import { GenderBadgeDirective } from '../../../directives/gender-badge-directive';
import { AgeBadgeDirective } from '../../../directives/age-badge-directive';
import { CaseTypeBadgeDirective } from '../../../directives/case-type-badge-directive';
import { CardComponent } from '../../card/card';
import { ButtonComponent } from '../../button/button';

import { environment } from '../../../../../environments/environment';
import { CaseType } from '../../../enums/case-type';
import { AuthService } from '../../../../core/services/auth.service';
import { ViewProfilePopup } from '../../view-profile-popup/view-profile-popup';

@Component({
  selector: 'app-case-card',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    RouterModule,
    GenderBadgeDirective,
    AgeBadgeDirective,
    CaseTypeBadgeDirective,
    CardComponent,
    ButtonComponent,
    ViewProfilePopup,
  ],
  templateUrl: './case-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CaseCardComponent {
  router = inject(Router);
  private readonly authService = inject(AuthService);

  readonly selectedUserId = signal<string | null>(null);
  private publisherImageError = signal(false);

  // Inputs and outputs
  readonly caseItem = input.required<CaseListItemResponse>();
  readonly showUrgentTag = input(false);
  readonly detailRoute = input<Array<string | number> | null>(null);
  readonly similarity = input<number>();
  readonly onContact = output<number>();
  showCaseType = input(true);
  showContactButton = input(true);
  showGender = input(true);
  showAge = input(true);
  createdAtLabel = input('تاريخ الإضافة');

  // Enums for template
  protected readonly CaseTypeEnum = CaseType;

  // Static values
  private readonly baseUrl = environment.baseUrl;
  protected readonly fallbackImage = '/images/logo.jpg';

  // Reactive state
  private imageError = signal(false);

  readonly isOwner = computed(() => {
    if (!this.authService.isLoggedIn()) return false;
    const currentUserId = this.authService.getCurrentUserId();
    const currentUserEmail = this.authService.currentUser()?.email?.toLowerCase();
    const item = this.caseItem();

    const caseUserId = item.user?.id || item.userId;
    if (caseUserId && currentUserId) {
      return caseUserId === currentUserId;
    }
    if ((item as any).userEmail && currentUserEmail) {
      return (item as any).userEmail.toLowerCase() === currentUserEmail;
    }
    if (item.user?.email && currentUserEmail) {
      return item.user.email.toLowerCase() === currentUserEmail;
    }
    return false;
  });

  readonly shouldShowContactButton = computed(() => {
    if (!this.showContactButton()) return false;
    if (!this.authService.isLoggedIn()) return true;
    return !this.isOwner();
  });

  // Computed signals
  readonly imageSrc = computed(() => {
    const item = this.caseItem();
    if (this.imageError() || !item.mainPhoto) {
      return this.fallbackImage;
    }
    return `${this.baseUrl}${item.mainPhoto}`;
  });

  readonly fullName = computed(() => {
    const item = this.caseItem();
    return [item.fName, item.sName, item.tName, item.lName].filter(Boolean).join(' ').trim();
  });

  readonly location = computed(() => {
    const item = this.caseItem();
    const parts = [item.city, item.government].filter(Boolean);
    return parts.length ? parts.join(' ، ') : null;
  });

  readonly ageCategory = computed(() => getAgeCategory(this.caseItem().age));

  readonly hasLocation = computed(() => {
    const item = this.caseItem();
    return !!(item.city || item.government);
  });

  readonly hasCreatedAt = computed(() => !!this.caseItem().createdAt);

  readonly urgentEndDate = computed(() => {
    const item = this.caseItem() as CaseListItemResponse & { endDate?: string | null };
    return item.endDate ?? null;
  });

  readonly hasUrgentEndDate = computed(() => !!this.urgentEndDate());

  readonly detailRouteArray = computed(() => {
    const custom = this.detailRoute();
    if (custom) return custom;

    const item = this.caseItem();
    switch (item.caseType) {
      case CaseType.Urgent:
        return ['/urgent', item.id];
      case CaseType.LongTerm:
        return ['/long-term', item.id];
      case CaseType.Unknown:
        return ['/unknown', item.id];
      default:
        return ['/cases', item.id];
    }
  });

  readonly publisherName = computed(() => {
    if (this.isOwner()) {
      return 'أنت (صاحب الحالة)';
    }
    const u = this.caseItem().user;
    if (u && (u.fName || u.lName)) {
      return `${u.fName ?? ''} ${u.lName ?? ''}`.trim();
    }
    return null;
  });

  readonly publisherInitials = computed(() => {
    const u = this.caseItem().user;
    if (!u) return '';
    const f = u.fName?.[0] ?? '';
    const l = u.lName?.[0] ?? '';
    return (f + l).toUpperCase();
  });

  readonly publisherImageSrc = computed(() => {
    const u = this.caseItem().user;
    if (u?.profileImage && !this.publisherImageError()) {
      return `${this.baseUrl}${u.profileImage}`;
    }
    return null;
  });

  onPublisherImageError(): void {
    this.publisherImageError.set(true);
  }

  openPublisherProfile(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    const id = this.caseItem().user?.id || this.caseItem().userId;
    if (id) {
      this.selectedUserId.set(id);
    }
  }

  // Event handler
  onImageError(): void {
    this.imageError.set(true);
  }

  startChat(id: number): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/auth/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    this.router.navigate(['/chat/start', id]);
  }
}
