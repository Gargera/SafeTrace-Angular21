import {
  AfterContentInit,
  Component,
  ContentChildren,
  EventEmitter,
  Input,
  OnInit,
  Output,
  QueryList,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgModel } from '@angular/forms';
import { debounceTime, distinctUntilChanged, map, merge } from 'rxjs';
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
  imports: [ReactiveFormsModule, FormsModule],
  templateUrl: './case-filters.component.html',
  styleUrls: ['./case-filters.component.css'],
})
export class CaseFiltersComponent implements OnInit, AfterContentInit {
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

  @ContentChildren(NgModel, { descendants: true }) private projectedModels!: QueryList<NgModel>;

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

    const formControlStreams = [
      this.filterForm.get('fullName')!,
      this.filterForm.get('gender')!,
      this.filterForm.get('ageCategory')!,
      this.filterForm.get('government')!,
      this.filterForm.get('city')!,
      this.filterForm.get('fromDate')!,
      this.filterForm.get('toDate')!,
      this.filterForm.get('ageSort')!,
      this.filterForm.get('dateSort')!,
    ].map((control) => {
      const debounceMs = control === this.filterForm.get('fullName') ? 400 : 0;
      return control.valueChanges.pipe(
        debounceTime(debounceMs),
        map(() => this.buildFilterRequest()),
        distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
      );
    });

    merge(...formControlStreams)
      .pipe(takeUntilDestroyed())
      .subscribe((request) => {
        this.filterChange.emit(request);
      });
  }

  ngAfterContentInit(): void {
    this.bindProjectedModelChanges();
    this.projectedModels.changes.pipe(takeUntilDestroyed()).subscribe(() => {
      this.bindProjectedModelChanges();
    });
  }

  private bindProjectedModelChanges(): void {
    this.projectedModels.forEach((model) => {
      model.valueChanges?.pipe(takeUntilDestroyed()).subscribe(() => {
        this.filterChange.emit(this.buildFilterRequest());
      });
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

  resetFilters(): void {
    this.filterForm.reset(null, { emitEvent: false });
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
