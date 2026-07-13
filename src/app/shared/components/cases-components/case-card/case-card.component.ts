// shared/components/case-card/case-card.component.ts
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CaseListItemResponse } from '../../../../core/models/Cases.model';
import { getGenderTranslationAr } from '../../../../core/constants/gender.dictionary';
import { getAgeCategoryTranslationAr } from '../../../../core/constants/age.categories.dictionary';
import { AgeCategories } from '../../../enums/age-categories';

@Component({
  selector: 'app-case-card',
  standalone: true,
  imports: [DatePipe, RouterModule],
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

  getGenderLabel(): string {
    return getGenderTranslationAr(this.caseItem.gender);
  }

  getAgeCategoryLabel(): string {
    const ageCategory = this.getAgeCategory(this.caseItem.age);
    return ageCategory ? getAgeCategoryTranslationAr(ageCategory) : '';
  }

  getUrgentEndDate(): string | null {
    return (this.caseItem as CaseListItemResponse & { endDate?: string | null }).endDate ?? null;
  }

  private getAgeCategory(age: number): AgeCategories | null {
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

  hasAgeCategory(): boolean {
    return !!this.getAgeCategoryLabel();
  }

  hasCreatedAt(): boolean {
    return !!this.caseItem?.createdAt;
  }

  hasUrgentEndDate(): boolean {
    return !!this.getUrgentEndDate();
  }
}