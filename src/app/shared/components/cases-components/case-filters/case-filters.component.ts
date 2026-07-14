import {
  AfterContentInit,
  Component,
  ContentChildren,
  DestroyRef,
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
import { Subscription, debounceTime, distinctUntilChanged, map, merge } from 'rxjs';
import { CasesFilterRequest } from '../../../../core/models/Cases.model';
import { AgeCategories } from '../../../enums/age-categories';
import { getAgeCategoryTranslationAr } from '../../../../core/constants/age.categories.dictionary';
import { CardComponent } from '../../../ui/card/card.component';
import { DividerComponent } from '../../../ui/divider/divider.component';
import { FormLabelComponent } from '../../../ui/label/form-label.component';
import { TextInputComponent } from '../../../ui/text-input/text-input.component';
import { SelectInputComponent } from '../../../ui/select-input/select-input.component';
import { DateInputComponent } from '../../../ui/date-input/date-input.component';
import { BadgeComponent } from '../../../ui/badge/badge.component';
import { TextButtonComponent } from '../../../ui/button/text-button.component';
import { SearchIconComponent } from '../../../ui/icon/search-icon.component';
import { ChevronIconComponent } from '../../../ui/icon/chevron-icon.component';
import { ResetIconComponent } from '../../../ui/icon/reset-icon.component';

@Component({
  selector: 'app-case-filters',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    CardComponent,
    DividerComponent,
    FormLabelComponent,
    TextInputComponent,
    SelectInputComponent,
    DateInputComponent,
    BadgeComponent,
    TextButtonComponent,
    SearchIconComponent,
    ChevronIconComponent,
    ResetIconComponent,
  ],
  templateUrl: './case-filters.component.html',
  styleUrls: ['./case-filters.component.css'],
})
export class CaseFiltersComponent implements OnInit, AfterContentInit {
  @Input() genders: number[] = [0, 1];
  @Input() ageSorts: number[] = [0, 1];
  @Input() dateSorts: number[] = [0, 1];

  @Output() filterChange = new EventEmitter<CasesFilterRequest>();
  @Output() reset = new EventEmitter<void>();

  readonly ageCategories = Object.values(AgeCategories);
  showAdvanced = false;
  filterForm!: FormGroup;

  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  @ContentChildren(NgModel, { descendants: true })
  private projectedModels!: QueryList<NgModel>;
  private readonly projectedModelSubscriptions = new Map<NgModel, Subscription>();
  private lastEmittedRequest: CasesFilterRequest | null = null;
  private hasEmittedInitialRequest = false;

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
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((request) => {
        this.emitFilterChange(request);
      });
  }

  ngAfterContentInit(): void {
    this.bindProjectedModelChanges();
    this.projectedModels.changes.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.bindProjectedModelChanges();
    });

    queueMicrotask(() => this.emitInitialFilterChange());
  }

  private bindProjectedModelChanges(): void {
    this.projectedModelSubscriptions.forEach((subscription) => subscription.unsubscribe());
    this.projectedModelSubscriptions.clear();

    this.projectedModels.forEach((model) => {
      const subscription = model.valueChanges
        ?.pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => {
          this.emitFilterChange(this.buildFilterRequest());
        });

      if (subscription) {
        this.projectedModelSubscriptions.set(model, subscription);
      }
    });
  }

  private emitInitialFilterChange(): void {
    if (this.hasEmittedInitialRequest) {
      return;
    }

    this.hasEmittedInitialRequest = true;
    this.emitFilterChange(this.buildFilterRequest());
  }

  private emitFilterChange(request: CasesFilterRequest): void {
    const sanitizedRequest = this.normalizeFilterRequest(request);
    const isDuplicate =
      this.lastEmittedRequest !== null &&
      JSON.stringify(this.lastEmittedRequest) === JSON.stringify(sanitizedRequest);

    if (isDuplicate) {
      return;
    }

    this.lastEmittedRequest = sanitizedRequest;
    this.filterChange.emit(sanitizedRequest);
  }

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
    this.emitFilterChange(this.buildFilterRequest());
  }

  buildFilterRequest(): CasesFilterRequest {
    const raw = this.filterForm.value;
    return this.normalizeFilterRequest({
      status: null,
      gender: raw.gender,
      ageCategory: raw.ageCategory,
      fullName: raw.fullName,
      government: raw.government,
      city: raw.city,
      minAge: null,
      maxAge: null,
      fromDate: raw.fromDate,
      toDate: raw.toDate,
      ageSort: raw.ageSort,
      dateSort: raw.dateSort,
      page: 1,
      pageSize: 12,
    });
  }

  private normalizeFilterRequest(request: CasesFilterRequest): CasesFilterRequest {
    return {
      ...request,
      gender: this.toEnumOrNull(request.gender),
      ageCategory: this.toEnumOrNull(request.ageCategory),
      fullName: this.toStringOrNull(request.fullName),
      government: this.toStringOrNull(request.government),
      city: this.toStringOrNull(request.city),
      minAge: this.toNumberOrNull(request.minAge),
      maxAge: this.toNumberOrNull(request.maxAge),
      fromDate: this.toStringOrNull(request.fromDate),
      toDate: this.toStringOrNull(request.toDate),
      ageSort: this.toNumberOrNull(request.ageSort),
      dateSort: this.toNumberOrNull(request.dateSort),
      page: request.page ?? 1,
      pageSize: request.pageSize ?? 12,
    };
  }

  private toNumberOrNull(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const numericValue = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(numericValue) && numericValue !== Number.MAX_VALUE ? numericValue : null;
  }

  private toEnumOrNull<T>(value: T | null | undefined): T | null {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === 'string') {
      return value.trim().length > 0 ? value : null;
    }

    if (typeof value === 'number') {
      return Number.isFinite(value) && value !== Number.MAX_VALUE ? value : null;
    }

    return value;
  }

  private toStringOrNull(value: unknown): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    const textValue = String(value).trim();
    return textValue.length > 0 ? textValue : null;
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
