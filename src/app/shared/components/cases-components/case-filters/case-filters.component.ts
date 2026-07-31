import {
  AfterContentInit,
  Component,
  ContentChildren,
  DestroyRef,
  OnInit,
  QueryList,
  inject,
  input,
  output,
  computed,
  HostListener,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, AbstractControl, ValidationErrors, Validators } from '@angular/forms';
import { NgModel } from '@angular/forms';
import { Subscription, debounceTime, distinctUntilChanged, map, merge } from 'rxjs';
import { NgTemplateOutlet } from '@angular/common';
import { CasesFilterRequest } from '../../../../core/models/cases.model';
import { AgeCategories } from '../../../enums/age-categories';
import { getAgeCategoryTranslationAr } from '../../../../core/constants/age.categories.dictionary';
import { CardComponent } from '../../card/card';
import { ButtonComponent } from '../../button/button';
import { FormField } from '../../form-field/form-field';
import { getAgeRange } from '../../../helper/age-category.helper';
import { CaseType } from '../../../../shared/enums/case-type';
import { CaseStatus } from '../../../../shared/enums/case-status';

import { Gender } from '../../../../shared/enums/gender';
import { EGYPT_GOVERNORATES, getCitiesForGovernorate } from '../../../../core/constants/governorates';
import { searchRadiusValidator } from '../../../../shared/validators/search-radius.validator';
import { dateRangeValidator } from '../../../../shared/validators/date-range.validator';
import { pastDate } from '../../../../shared/validators/past-date.validator';
import { validEnum } from '../../../../shared/validators/enum.validator';
import { arabicText } from '../../../../shared/validators/arabic-text.validator';
import { fullNameOrCaseCodeValidator } from '../../../../shared/validators/full-name-or-case-code.validator';
import { getFormFieldError, isFieldInvalid } from '../../../../shared/helper/form-validation.helper';
import { AgeSort } from '../../../enums/age-sort';
import { DateSort } from '../../../enums/date-sort';

@Component({
  selector: 'app-case-filters',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, CardComponent, FormField, ButtonComponent, NgTemplateOutlet],
  templateUrl: './case-filters.component.html',
  styleUrls: ['./case-filters.component.css'],
})
export class CaseFiltersComponent implements OnInit, AfterContentInit {
  // ---------- Search mode input ----------
  searchMode = input<'auto' | 'name-only'>('auto');

  // ---------- Required signal inputs (used in template) ----------
  genders = input<number[]>([0, 1]);
  ageSorts = input<number[]>([0, 1]);
  dateSorts = input<number[]>([0, 1]);

  // ---------- Visibility inputs ----------
  showSearch = input(true);
  showGender = input(true);
  showAgeCategory = input(true);
  showCaseType = input(false);
  showCaseStatus = input(false);
  showGovernment = input(true);
  showCity = input(true);
  showFromDate = input(true);
  showToDate = input(true);
  showAgeSort = input(true);
  showDateSort = input(true);
  showRadius = input(false);

  // ---------- Placement inputs ----------
  searchInAdvanced = input(false);
  genderInAdvanced = input(false);
  ageCategoryInAdvanced = input(false);
  caseTypeInAdvanced = input(false);
  caseStatusInAdvanced = input(false);
  governmentInAdvanced = input(true);
  cityInAdvanced = input(true);
  fromDateInAdvanced = input(true);
  toDateInAdvanced = input(true);
  ageSortInAdvanced = input(true);
  dateSortInAdvanced = input(false);
  radiusInAdvanced = input(true);

  // ---------- Layout inputs ----------
  gridTemplate = input<string | null>(null);

  // ---------- Outputs ----------
  filterChange = output<CasesFilterRequest>();
  reset = output<void>();

  // ---------- Public fields ----------
  readonly governorateOptions = EGYPT_GOVERNORATES;
  readonly ageCategories = Object.values(AgeCategories);
  readonly caseTypeOptions = [CaseType.Urgent, CaseType.LongTerm, CaseType.Unknown];
  readonly statusOptions = Object.values(CaseStatus) as CaseStatus[];

  showAdvanced = false;
  filterForm!: FormGroup;

  // ---------- Computed grid columns ----------
  mainFilterCount = computed(() => {
    let count = 0;
    if (this.showSearch() && !this.searchInAdvanced()) count++;
    if (this.showGender() && !this.genderInAdvanced()) count++;
    if (this.showAgeCategory() && !this.ageCategoryInAdvanced()) count++;
    if (this.showCaseType() && !this.caseTypeInAdvanced()) count++;
    if (this.showCaseStatus() && !this.caseStatusInAdvanced()) count++;
    if (this.showGovernment() && !this.governmentInAdvanced()) count++;
    if (this.showCity() && !this.cityInAdvanced()) count++;
    if (this.showFromDate() && !this.fromDateInAdvanced()) count++;
    if (this.showToDate() && !this.toDateInAdvanced()) count++;
    if (this.showAgeSort() && !this.ageSortInAdvanced()) count++;
    if (this.showDateSort() && !this.dateSortInAdvanced()) count++;
    return count;
  });

  isMobile = signal(window.innerWidth < 768);

  @HostListener('window:resize')
  onResize() {
    this.isMobile.set(window.innerWidth < 768);
  }

  activeGridTemplate = computed(() => {
    if (this.isMobile()) return null;

    const custom = this.gridTemplate();
    if (custom) return custom;

    const count = this.mainFilterCount();
    if (count <= 1) return '1fr';

    let template = '';
    const hasSearch = this.showSearch() && !this.searchInAdvanced();
    for (let i = 0; i < count; i++) {
      if (i === 0 && hasSearch) {
        template += '2fr ';
      } else {
        template += '1fr ';
      }
    }
    return template.trim();
  });

  hasAdvancedFilters = computed(() => {
    return (
      (this.showSearch() && this.searchInAdvanced()) ||
      (this.showGender() && this.genderInAdvanced()) ||
      (this.showAgeCategory() && this.ageCategoryInAdvanced()) ||
      (this.showCaseType() && this.caseTypeInAdvanced()) ||
      (this.showCaseStatus() && this.caseStatusInAdvanced()) ||
      (this.showGovernment() && this.governmentInAdvanced()) ||
      (this.showCity() && this.cityInAdvanced()) ||
      (this.showFromDate() && this.fromDateInAdvanced()) ||
      (this.showToDate() && this.toDateInAdvanced()) ||
      (this.showAgeSort() && this.ageSortInAdvanced()) ||
      (this.showDateSort() && this.dateSortInAdvanced())
    );
  });

  // ---------- Private ----------
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  @ContentChildren(NgModel, { descendants: true })
  private projectedModels!: QueryList<NgModel>;
  private readonly projectedModelSubscriptions = new Map<NgModel, Subscription>();

  // Track last emitted raw string to prevent duplicates
  private lastEmittedString: string | null = null;
  private hasEmittedInitialRequest = false;

  availableCities = signal<string[]>([]);

  // ---------- Lifecycle ----------
  ngOnInit(): void {
    const searchValidator =
      this.searchMode() === 'name-only'
        ? [arabicText(), Validators.maxLength(243)]
        : [fullNameOrCaseCodeValidator()];

    this.filterForm = this.fb.group(
      {
        fullName: ['', searchValidator],
        gender: ['', [validEnum(Gender)]],
        ageCategory: ['', [validEnum(AgeCategories)]],
        government: ['', [arabicText(), Validators.maxLength(100)]],
        city: ['', [arabicText(), Validators.maxLength(100)]],
        fromDate: ['', [pastDate()]],
        toDate: ['', [pastDate()]],
        ageSort: ['', [validEnum(AgeSort)]],
        dateSort: ['', [validEnum(DateSort)]],
        caseType: ['', [validEnum(CaseType)]],
        status: ['', [validEnum(CaseStatus)]],
        radiusInKm: ['', [searchRadiusValidator(1, 1000)]],
      },
      { validators: dateRangeValidator('fromDate', 'toDate') },
    );

    this.filterForm.get('government')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((gov) => {
        const cities = getCitiesForGovernorate(gov);
        this.availableCities.set(cities);
        const currentCity = this.filterForm.get('city')?.value;
        if (currentCity && !cities.includes(currentCity)) {
          this.filterForm.get('city')?.setValue('', { emitEvent: true });
        }
      });

    // Unified reactive flow
    this.filterForm.valueChanges
      .pipe(
        debounceTime(300), // Debounce whole form to prevent rapid firing
        map(() => this.filterForm.getRawValue()),
        distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        if (this.filterForm.valid) {
          this.emitFilterChange();
        } else {
          this.filterForm.markAllAsTouched();
        }
      });
  }

  ngAfterContentInit(): void {
    this.bindProjectedModelChanges();
    this.projectedModels.changes.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.bindProjectedModelChanges();
    });

    // Emit initial value safely
    if (this.filterForm.valid) {
      this.emitFilterChange(true);
    } else {
      this.filterForm.markAllAsTouched();
    }
  }

  // ---------- Projected models binding ----------
  private bindProjectedModelChanges(): void {
    this.projectedModelSubscriptions.forEach((subscription) => subscription.unsubscribe());
    this.projectedModelSubscriptions.clear();

    this.projectedModels.forEach((model) => {
      const subscription = model.valueChanges
        ?.pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => {
          if (this.filterForm.valid) {
            this.emitFilterChange();
          } else {
            this.filterForm.markAllAsTouched();
          }
        });

      if (subscription) {
        this.projectedModelSubscriptions.set(model, subscription);
      }
    });
  }

  // ---------- Validators & Error Helpers ----------
  getFieldError(field: string): string | null {
    return getFormFieldError(this.filterForm, field);
  }

  isInvalid(field: string): boolean {
    return isFieldInvalid(this.filterForm, field);
  }

  // ---------- Emit helpers ----------
  onSubmit(event?: Event): void {
    if (event) event.preventDefault();
    if (this.filterForm.invalid) {
      this.filterForm.markAllAsTouched();
      return;
    }
    this.emitFilterChange();
  }

  private emitFilterChange(isInitial = false): void {
    if (this.filterForm.invalid) {
      this.filterForm.markAllAsTouched();
      return;
    }
    if (isInitial && this.hasEmittedInitialRequest) {
      return;
    }

    const request = this.buildFilterRequest();

    // Custom distinct check based on normalized request
    const requestString = JSON.stringify(request);
    if (this.lastEmittedString === requestString) {
      return;
    }

    this.lastEmittedString = requestString;
    if (isInitial) {
      this.hasEmittedInitialRequest = true;
    }

    this.filterChange.emit(request);
  }

  // ---------- UI helpers ----------
  get activeAdvancedCount(): number {
    const raw = this.filterForm?.value ?? {};
    const advancedKeys: string[] = [];
    if (this.searchInAdvanced()) advancedKeys.push('fullName');
    if (this.genderInAdvanced()) advancedKeys.push('gender');
    if (this.ageCategoryInAdvanced()) advancedKeys.push('ageCategory');
    if (this.caseTypeInAdvanced()) advancedKeys.push('caseType');
    if (this.caseStatusInAdvanced()) advancedKeys.push('status');
    if (this.governmentInAdvanced()) advancedKeys.push('government');
    if (this.cityInAdvanced()) advancedKeys.push('city');
    if (this.fromDateInAdvanced()) advancedKeys.push('fromDate');
    if (this.toDateInAdvanced()) advancedKeys.push('toDate');
    if (this.ageSortInAdvanced()) advancedKeys.push('ageSort');
    if (this.dateSortInAdvanced()) advancedKeys.push('dateSort');
    if (this.radiusInAdvanced()) advancedKeys.push('radiusInKm');

    return advancedKeys.filter(
      (key) => raw[key] !== null && raw[key] !== undefined && raw[key] !== '',
    ).length;
  }

  toggleAdvanced(): void {
    this.showAdvanced = !this.showAdvanced;
  }

  resetFilters(): void {
    this.availableCities.set([]);
    this.filterForm.reset(
      {
        fullName: '',
        gender: '',
        ageCategory: '',
        government: '',
        city: '',
        fromDate: '',
        toDate: '',
        ageSort: '',
        dateSort: '',
        caseType: '',
        status: '',
        radiusInKm: '',
      },
      { emitEvent: true } // This will trigger the valueChanges pipeline
    );
    this.showAdvanced = false;
    this.reset.emit();
  }

  // ---------- Build filter request ----------
  buildFilterRequest(): CasesFilterRequest {
    const raw = this.filterForm.value;
    const { minAge, maxAge } = getAgeRange(raw.ageCategory);

    const searchValue = this.toStringOrNull(raw.fullName);
    let fullName = null;
    let caseCode = null;

    if (searchValue) {
      if (this.searchMode() === 'name-only') {
        fullName = searchValue;
      } else {
        // If the search value contains only english letters, numbers, and hyphens,
        // AND contains at least one digit, treat it as a case code.
        const isCaseCode = /^(URG|LNG|UNK)-\d+$/.test(searchValue.toUpperCase());
        if (isCaseCode) {
          caseCode = searchValue;
        } else {
          fullName = searchValue;
        }
      }
    }

    return this.normalizeFilterRequest({
      status: raw.status,
      gender: raw.gender,
      ageCategory: raw.ageCategory,
      fullName,
      caseCode,
      government: raw.government,
      city: raw.city,
      minAge,
      maxAge,
      fromDate: raw.fromDate,
      toDate: raw.toDate,
      ageSort: raw.ageSort,
      dateSort: raw.dateSort,
      caseType: raw.caseType,
      radiusInKm: this.toNumberOrNull(raw.radiusInKm),
      page: 1,
      pageSize: 12,
    });
  }

  // ---------- Normalization ----------
  private normalizeFilterRequest(request: CasesFilterRequest & { radiusInKm?: number | null }): CasesFilterRequest {
    return {
      ...request,
      status: this.toEnumOrNull(request.status),
      gender: this.toEnumOrNull(request.gender),
      ageCategory: this.toEnumOrNull(request.ageCategory),
      caseType: this.toEnumOrNull(request.caseType),
      fullName: this.toStringOrNull(request.fullName),
      caseCode: this.toStringOrNull(request.caseCode),
      government: this.toStringOrNull(request.government),
      city: this.toStringOrNull(request.city),
      minAge: this.toNumberOrNull(request.minAge),
      maxAge: this.toNumberOrNull(request.maxAge),
      fromDate: this.toStringOrNull(request.fromDate),
      toDate: this.toStringOrNull(request.toDate),
      ageSort: this.toNumberOrNull(request.ageSort),
      dateSort: this.toNumberOrNull(request.dateSort),
      radiusInKm: this.toNumberOrNull(request.radiusInKm),
      page: request.page ?? 1,
      pageSize: request.pageSize ?? 12,
    } as CasesFilterRequest;
  }

  // ---------- Type helpers ----------
  private toNumberOrNull(value: unknown): number | null {
    if (value === null || value === undefined || value === '' || value === 'null') {
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
      const trimmed = value.trim();
      return trimmed === '' || trimmed === 'null' ? null : (trimmed as any);
    }

    if (typeof value === 'number') {
      return Number.isFinite(value) && value !== Number.MAX_VALUE ? value : null;
    }

    return value as T;
  }

  private toStringOrNull(value: unknown): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    const textValue = String(value).trim();
    return textValue === '' || textValue === 'null' ? null : textValue;
  }

  // ---------- Label methods ----------
  getGenderLabel(gender: number): string {
    const labels: Record<number, string> = { 0: 'ذكر', 1: 'أنثى' };
    return labels[gender] ?? String(gender);
  }

  getAgeCategoryLabel(ageCategory: AgeCategories | null): string {
    return getAgeCategoryTranslationAr(ageCategory ?? null) || 'الكل';
  }

  getAgeSortLabel(sort: number): string {
    const labels: Record<number, string> = { 0: 'الأكبر أولاً', 1: ' الأصغر أولاً' };
    return labels[sort] ?? String(sort);
  }

  getDateSortLabel(sort: number): string {
    const labels: Record<number, string> = { 0: 'الأحدث أولاً', 1: 'الأقدم أولاً' };
    return labels[sort] ?? String(sort);
  }

  getCaseTypeLabel(type: CaseType): string {
    const labels: Record<CaseType, string> = {
      [CaseType.Urgent]: 'عاجلة',
      [CaseType.LongTerm]: 'طويلة الأمد',
      [CaseType.Unknown]: 'مجهولة',
    };
    return labels[type] ?? String(type);
  }

  private readonly caseStatusLabels: Record<CaseStatus, string> = {
    [CaseStatus.Pending]: 'قيد المراجعة',
    [CaseStatus.Active]: 'نشطة',
    [CaseStatus.Deleted]: 'محذوفة',
    [CaseStatus.Found]: 'تم العثور',
    [CaseStatus.Rejected]: 'مرفوضة',
    [CaseStatus.Expired]: 'منتهية',
  };

  getCaseStatusLabel(status: CaseStatus): string {
    return this.caseStatusLabels[status] ?? status;
  }
}
