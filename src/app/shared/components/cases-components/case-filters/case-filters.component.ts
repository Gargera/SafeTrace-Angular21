import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CasesFilterRequest } from '../../../../core/models/Cases.model';
import { AgeCategories } from '../../../enums/age-categories';
import { getAgeCategoryTranslationAr } from '../../../../core/constants/age.categories.dictionary';

/**
 * NOTE: the label maps use placeholder Arabic strings mapped to numeric enum values
 * for Gender / AgeSort / DateSort. Replace with your real enum values if needed.
 */
@Component({
  selector: 'app-case-filters',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './case-filters.component.html',
  styleUrls: ['./case-filters.component.css'],
})
export class CaseFiltersComponent implements OnInit {
  // Pass the enum value arrays in from the parent (e.g. Object.values(CaseStatus))
  @Input() genders: number[] = [0, 1];
  @Input() ageSorts: number[] = [0, 1];
  @Input() dateSorts: number[] = [0, 1];

  @Output() filterChange = new EventEmitter<CasesFilterRequest>();
  @Output() reset = new EventEmitter<void>();

  readonly ageCategories = Object.values(AgeCategories);
  showAdvanced = false;
  filterForm!: FormGroup;

  private fb = inject(FormBuilder);

  // fields that live behind the "advanced filters" toggle - used to show a counter badge
  private readonly advancedFieldKeys = ['government', 'city', 'fromDate', 'toDate', 'ageSort'];

  ngOnInit(): void {
    this.filterForm = this.fb.group({
      fullName: [null],
      gender: [null],
      ageCategory: [null],
      government: [null],
      city: [null],
      fromDate: [null],
      toDate: [null],
      ageSort: [null],
      dateSort: [null],
    });
  }

  /** Number of advanced filters currently set - shown as a badge on the toggle button. */
  get activeAdvancedCount(): number {
    const raw = this.filterForm?.value ?? {};
    return this.advancedFieldKeys.filter(
      (key) => raw[key] !== null && raw[key] !== undefined && raw[key] !== '',
    ).length;
  }

  toggleAdvanced(): void {
    this.showAdvanced = !this.showAdvanced;
  }

  onSubmit(): void {
    this.filterChange.emit(this.buildFilterRequest());
  }

  resetFilters(): void {
    this.filterForm.reset();
    this.showAdvanced = false;
    this.reset.emit();
    this.filterChange.emit(this.buildFilterRequest());
  }

  buildFilterRequest(): CasesFilterRequest {
    const raw = this.filterForm.value;
    return {
      status: null,
      gender: raw.gender || null,
      ageCategory: raw.ageCategory || null,
      fullName: raw.fullName || null,
      government: raw.government || null,
      city: raw.city || null,
      minAge: null,
      maxAge: null,
      fromDate: raw.fromDate || null,
      toDate: raw.toDate || null,
      ageSort: this.toNumberOrNull(raw.ageSort),
      dateSort: this.toNumberOrNull(raw.dateSort),
      page: 1,
    };
  }

  private toNumberOrNull(value: unknown): number | null {
    return value === null || value === undefined || value === '' ? null : Number(value);
  }

  // --- Placeholder labels: replace with your real enum labels ---
  getGenderLabel(gender: number): string {
    const labels: Record<number, string> = { 0: 'ذكر', 1: 'أنثى' };
    return labels[gender] ?? String(gender);
  }

  getAgeCategoryLabel(ageCategory: AgeCategories | null): string {
    return getAgeCategoryTranslationAr(ageCategory ?? null) || 'الكل';
  }

  getAgeSortLabel(sort: number): string {
    const labels: Record<number, string> = { 0: 'الأصغر أولاً', 1: 'الأكبر أولاً' };
    return labels[sort] ?? String(sort);
  }

  getDateSortLabel(sort: number): string {
    const labels: Record<number, string> = { 0: 'الأحدث أولاً', 1: 'الأقدم أولاً' };
    return labels[sort] ?? String(sort);
  }
}
