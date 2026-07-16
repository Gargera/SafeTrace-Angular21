import { ChangeDetectionStrategy, Component, input, output, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CaseType } from '../../../../shared/enums/case-type';
import { CaseStatus } from '../../../../shared/enums/case-status';
import { AgeCategories } from '../../../../shared/enums/age-categories';
import { GenderBadgeDirective } from '../../../../shared/directives/gender-badge-directive';
import { AgeBadgeDirective } from '../../../../shared/directives/age-badge-directive';
import { CaseTypeBadgeDirective } from '../../../../shared/directives/case-type-badge-directive';
import { CaseStatusBadgeDirective } from '../../../../shared/directives/case-status-badge-directive';
import { ButtonComponent } from '../../../../shared/components/button/button';
import { MyCaseListItemResponse } from '../../../../features/user-profile/model/profile.model';
import { CardComponent } from "../../card/card";

@Component({
  selector: 'app-case-card-compact',
  standalone: true,
  imports: [
    DatePipe,
    RouterModule,
    GenderBadgeDirective,
    AgeBadgeDirective,
    CaseTypeBadgeDirective,
    CaseStatusBadgeDirective,
    ButtonComponent,
    CardComponent
],
  templateUrl: './case-card-compact.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CaseCardCompactComponent {
  readonly caseItem = input.required<MyCaseListItemResponse>();
  readonly onDelete = output<number>();
  readonly onMarkAsFound = output<number>();

  protected readonly CaseType = CaseType;
  protected readonly CaseStatus = CaseStatus;
  private readonly fallbackImage = '/images/logo.jpg';
  private imageHasError = signal(false);

  // Map AgeCategoryResponse to AgeCategories enum
  ageCategoryEnum = computed(() => {
    const category = this.caseItem().ageCategory;
    if (!category || !category.name) {
      return AgeCategories.Adult; // default fallback
    }

    // Map backend names to frontend AgeCategories enum
    const nameMap: Record<string, AgeCategories> = {
      'Infant': AgeCategories.Toddler,
      'Child': AgeCategories.Child,
      'Teen': AgeCategories.Teenager,
      'Teenager': AgeCategories.Teenager,
      'Young': AgeCategories.Young,
      'Adult': AgeCategories.Adult,
      'Mid Adult': AgeCategories.MidAdult,
      'MidAdult': AgeCategories.MidAdult,
      'Late Adult': AgeCategories.LateAdult,
      'LateAdult': AgeCategories.LateAdult,
      'Elderly': AgeCategories.LateAdult,
    };

    return nameMap[category.name] || AgeCategories.Adult;
  });

  getImageSrc(): string {
    const item = this.caseItem();
    if (this.imageHasError() || !item.mainImageUrl) {
      return this.fallbackImage;
    }
    return item.mainImageUrl;
  }

  onImageError(): void {
    this.imageHasError.set(true);
  }

  getLocation(): string {
    const item = this.caseItem();
    return [item.city, item.government].filter(Boolean).join(' ، ') || 'غير محدد';
  }

  get computedDetailRoute(): Array<string | number> {
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
  }
}