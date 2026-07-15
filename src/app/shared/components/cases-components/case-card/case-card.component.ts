import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';

import { CaseListItemResponse } from '../../../../core/models/Cases.model';
import { AgeCategories } from '../../../enums/age-categories';
import { getAgeCategory } from '../../../helper/age-category.helper';

import { GenderBadgeDirective } from '../../../directives/gender-badge-directive';
import { AgeBadgeDirective } from '../../../directives/age-badge-directive';

import { CardComponent } from '../../card/card';
import { ButtonComponent } from '../../button/button';

import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-case-card',
  standalone: true,
  imports: [
    DatePipe,
    RouterModule,
    GenderBadgeDirective,
    AgeBadgeDirective,
    CardComponent,
    ButtonComponent,
  ],
  templateUrl: './case-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CaseCardComponent {
  readonly caseItem = input.required<CaseListItemResponse>();

  readonly showUrgentTag = input(false);

  readonly detailRoute = input<Array<string | number> | null>(null);

  readonly onContact = output<number>();

  readonly fallbackImage = '/images/logo.jpg';

  private readonly url = environment.baseUrl;

  private imageHasError = false;

  getImageSrc(): string {
    const item = this.caseItem();

    if (this.imageHasError || !item.mainPhoto) {
      return this.fallbackImage;
    }

    return `${this.url}${item.mainPhoto}`;
  }

  onImageError(): void {
    this.imageHasError = true;
  }

  getFullName(): string {
    const item = this.caseItem();

    return [item.fName, item.sName, item.tName, item.lName].filter(Boolean).join(' ').trim();
  }

  getLocation(): string | null {
    const item = this.caseItem();

    const parts = [item.city, item.government].filter(Boolean);

    return parts.length ? parts.join(' ، ') : null;
  }

  getUrgentEndDate(): string | null {
    const item = this.caseItem() as CaseListItemResponse & {
      endDate?: string | null;
    };

    return item.endDate ?? null;
  }

  getRemainingTime(): string {
    const endDate = this.getUrgentEndDate();

    if (!endDate) {
      return '';
    }

    const now = new Date().getTime();
    const end = new Date(endDate).getTime();
    const difference = end - now;

    // إذا كانت الحالة انتهت
    if (difference <= 0) {
      return 'انتهت';
    }

    // حساب الوقت المتبقي
    const minutes = Math.floor(difference / 60000);
    const days = Math.floor(minutes / (60 * 24));
    const hours = Math.floor((minutes % (60 * 24)) / 60);
    const remainingMinutes = minutes % 60;

    let result = 'تنتهي بعد ';

    if (days > 0) {
      result += `${days} يوم`;
      if (hours > 0) {
        result += ` و ${hours} ساعة`;
      }
    } else if (hours > 0) {
      result += `${hours} ساعة`;
      if (remainingMinutes > 0) {
        result += ` و ${remainingMinutes} دقيقة`;
      }
    } else {
      result += `${remainingMinutes} دقيقة`;
    }

    return result;
  }

  isExpired(): boolean {
    const endDate = this.getUrgentEndDate();
    if (!endDate) return false;
    return new Date(endDate).getTime() - Date.now() <= 0;
  }

  getAgeCategoryEnum(): AgeCategories {
    return getAgeCategory(this.caseItem().age);
  }

  hasLocation(): boolean {
    const item = this.caseItem();

    return !!(item.city || item.government);
  }

  hasCreatedAt(): boolean {
    return !!this.caseItem().createdAt;
  }

  hasUrgentEndDate(): boolean {
    return !!this.getUrgentEndDate();
  }
}
