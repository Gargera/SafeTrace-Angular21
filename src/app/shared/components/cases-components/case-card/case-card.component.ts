// shared/components/case-card/case-card.component.ts
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CaseListItemResponse } from '../../../../core/models/Cases.model';
import { AgeCategories } from '../../../enums/age-categories';
import { GenderBadgeDirective } from '../../../directives/gender-badge-directive';
import { AgeBadgeDirective } from '../../../directives/age-badge-directive';

@Component({
  selector: 'app-case-card',
  standalone: true,
  imports: [DatePipe, RouterModule, GenderBadgeDirective, AgeBadgeDirective],
  templateUrl: './case-card.component.html',
})
export class CaseCardComponent {
  @Input({ required: true }) caseItem!: CaseListItemResponse;
  @Input() showUrgentTag = false;
  @Input() detailRoute: Array<string | number> | null = null;
  @Output() onContact = new EventEmitter<number>();

  readonly fallbackImage = '/images/logo.jpg';
  private imageHasError = false;

  getImageSrc(): string {
    if (this.imageHasError || !this.caseItem?.mainPhoto) {
      return this.fallbackImage;
    }
    return this.caseItem.mainPhoto;
  }

  onImageError(): void {
    this.imageHasError = true;
  }

  getFullName(): string {
    return [this.caseItem?.fName, this.caseItem?.sName, this.caseItem?.tName, this.caseItem?.lName]
      .filter((value): value is string => Boolean(value))
      .join(' ')
      .trim();
  }

  getLocation(): string | null {
    const parts = [this.caseItem?.city, this.caseItem?.government].filter(
      (value): value is string => Boolean(value),
    );
    return parts.length ? parts.join(' • ') : null;
  }

  getUrgentEndDate(): string | null {
    return (this.caseItem as CaseListItemResponse & { endDate?: string | null }).endDate ?? null;
  }

  getAgeCategoryEnum(): AgeCategories {
    const age = this.caseItem.age;
    if (age <= 12) return AgeCategories.Child;
    if (age <= 24) return AgeCategories.Young;
    if (age <= 60) return AgeCategories.Adult;
    return AgeCategories.LateAdult;
  }

  // Helper methods for clean template
  hasImage(): boolean {
    return !this.imageHasError && !!this.caseItem?.mainPhoto;
  }

  hasLocation(): boolean {
    return !!this.getLocation();
  }

  hasCreatedAt(): boolean {
    return !!this.caseItem?.createdAt;
  }

  hasUrgentEndDate(): boolean {
    return !!this.getUrgentEndDate();
  }
}