// case-card-compact.component.ts
import { ChangeDetectionStrategy, Component, input, output, signal, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { CaseType } from '../../../../shared/enums/case-type';
import { CaseStatus } from '../../../../shared/enums/case-status';

import { CaseTypeBadgeDirective } from '../../../../shared/directives/case-type-badge-directive';
import { CaseStatusBadgeDirective } from '../../../../shared/directives/case-status-badge-directive';
import { ButtonComponent } from '../../../../shared/components/button/button';
import { MyCaseListItemResponse } from '../../../../features/user-profile/model/profile.model';
import { CardComponent } from '../../card/card';
import { environment } from '../../../../../environments/environment';
import { getAgeCategory } from '../../../helper/age-category.helper';
import { getCaseActions } from '../../../helper/cases-helper/case-actions.helper';

@Component({
  selector: 'app-case-card-compact',
  standalone: true,
  imports: [
    DatePipe,
    RouterModule,
    CaseTypeBadgeDirective,
    CaseStatusBadgeDirective,
    ButtonComponent,
    CardComponent,
  ],
  templateUrl: './case-card-compact.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CaseCardCompactComponent {
  // Inputs & outputs
  readonly caseItem = input.required<MyCaseListItemResponse>();
  readonly onDelete = output<number>();
  readonly onMarkAsFound = output<number>();

  // Enums for template
  protected readonly CaseType = CaseType;
  protected readonly CaseStatus = CaseStatus;

  // Static configuration
  private readonly baseUrl = environment.baseUrl;
  protected readonly fallbackImage = '/images/logo.jpg';

  // Reactive image error state
  private imageHasError = signal(false);
  //
  readonly isMyCase = input(false);
  // ----- Computed Signals -----

  /** Helper config for available actions based on case status and foundPersonInfoId */
  readonly actions = computed(() =>
    getCaseActions(this.caseItem().status, this.caseItem().foundPersonInfoId),
  );

  /** Age category derived from the case item's age using the provided helper */
  readonly ageCategoryEnum = computed(() => getAgeCategory(this.caseItem().age));

  /** Image source – fallback if error or missing */
  readonly imageSrc = computed(() => {
    const item = this.caseItem();
    if (this.imageHasError() || !item.mainImageUrl) {
      return this.fallbackImage;
    }
    return `${environment.filesBaseUrl}/${item.mainImageUrl}`;
  });

  /** Formatted location (city and government) */
  readonly location = computed(() => {
    const item = this.caseItem();
    return [item.city, item.government].filter(Boolean).join(' ، ') || 'غير محدد';
  });

  /** Router link for the detail page based on case type */
  readonly detailRoute = computed(() => {
    const item = this.caseItem();
    if (this.isMyCase()) {
      switch (item.caseType) {
        case CaseType.Urgent:
          return ['/urgent/my', item.id];
        case CaseType.LongTerm:
          return ['/long-term/my', item.id];
        case CaseType.Unknown:
          return ['/unknown/my', item.id];
        default:
          return ['/cases', item.id];
      }
    }
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

  /** Router link for the found details page using foundPersonInfoId (fallback to case id) */
  readonly foundDetailRoute = computed(() => {
    const item = this.caseItem();
    const targetId = item.foundPersonInfoId ?? item.id;
    return ['/founded', targetId];
  });

  /** Router link for the update/edit page based on case type */
  readonly updateRoute = computed(() => {
    const item = this.caseItem();
    switch (item.caseType) {
      case CaseType.Urgent:
        return ['/urgent/edit', item.id];
      case CaseType.LongTerm:
        return ['/long-term/edit', item.id];
      case CaseType.Unknown:
        return ['/unknown/found-details', item.id];
      default:
        return ['/cases', item.id];
    }
  });

  private router = inject(Router);

  onCardClick(): void {
    if (this.actions().canView) {
      this.router.navigate(this.detailRoute());
    } else if (this.actions().canViewFoundDetails) {
      this.router.navigate(this.foundDetailRoute());
    }
  }

  // ----- Event Handlers -----

  onImageError(): void {
    this.imageHasError.set(true);
  }
}
