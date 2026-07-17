// case-card.component.ts
import { ChangeDetectionStrategy, Component, input,inject, output, signal, computed } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterModule,Router } from '@angular/router';

import { CaseListItemResponse } from '../../../../core/models/Cases.model';
import { getAgeCategory } from '../../../helper/age-category.helper';

import { GenderBadgeDirective } from '../../../directives/gender-badge-directive';
import { AgeBadgeDirective } from '../../../directives/age-badge-directive';
import { CaseTypeBadgeDirective } from '../../../directives/case-type-badge-directive';
import { CardComponent } from '../../card/card';
import { ButtonComponent } from '../../button/button';

import { environment } from '../../../../../environments/environment';
import { CaseType } from '../../../enums/case-type';

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
  ],
  templateUrl: './case-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CaseCardComponent {
  router = inject(Router);
  // Inputs and outputs
  readonly caseItem = input.required<CaseListItemResponse>();
  readonly showUrgentTag = input(false);
  readonly detailRoute = input<Array<string | number> | null>(null);
  readonly similarity = input<number>();
  readonly onContact = output<number>();
  showCaseType = input(true);
  showContactButton = input(true);

  // Enums for template
  protected readonly CaseTypeEnum = CaseType;

  // Static values
  private readonly baseUrl = environment.baseUrl;
  protected readonly fallbackImage = '/images/logo.jpg';

  // Reactive state
  private imageError = signal(false);

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

  readonly showUrgentBadge = computed(
    () => this.caseItem().caseType === CaseType.Urgent || this.showUrgentTag(),
  );

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

  // Event handler
  onImageError(): void {
    this.imageError.set(true);
  }

  startChat(id: number): void {
    this.router.navigate(['/chat/start', id]);
  }
}
