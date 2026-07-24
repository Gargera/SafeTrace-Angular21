import { signal, WritableSignal } from '@angular/core';
import { CasesFilterRequest } from '../../core/models/Cases.model';
export interface SearchValueMapping {
    fullName: string | null;
    caseCode: string | null;
}
export class CasesFilterState<T extends CasesFilterRequest = CasesFilterRequest> {
    readonly filter: WritableSignal<T>;
    readonly currentPage = signal(1);
    readonly pageSize: WritableSignal<number>;
    readonly totalPages = signal(1);
    readonly totalItems = signal(0);
    readonly loading = signal(true);
    readonly hasError = signal(false);
    protected readonly defaultPageSize: number;
    constructor(defaultPageSize = 12, initialExtra: Partial<T> = {}) {
        this.defaultPageSize = defaultPageSize;
        this.pageSize = signal(defaultPageSize);
        this.filter = signal<T>(this.createEmptyFilter(initialExtra));
    }
    // --- Normalization Methods ---
    normalizeNumber(value: number | null | undefined): number | null {
        if (value === null || value === undefined) {
            return null;
        }
        const numericValue = typeof value === 'number' ? value : Number(value);
        return Number.isFinite(numericValue) && numericValue !== Number.MAX_VALUE ? numericValue : null;
    }
    normalizeEnum<E>(value: E | null | undefined): E | null {
        if (value === null || value === undefined) {
            return null;
        }
        if (typeof value === 'string') {
            return value.trim().length > 0 ? (value as E) : null;
        }
        if (typeof value === 'number') {
            return Number.isFinite(value) && value !== Number.MAX_VALUE ? (value as E) : null;
        }
        return value as E;
    }
    normalizeText(value: string | null | undefined): string | null {
        if (value === null || value === undefined) {
            return null;
        }
        const textValue = String(value).trim();
        return textValue.length > 0 ? textValue : null;
    }
    // --- Search Value Mapping (Extensible) ---
    protected mapSearchValue(fullName: string | null, caseCode: string | null): SearchValueMapping {
        return {
            fullName: this.normalizeText(fullName),
            caseCode: this.normalizeText(caseCode),
        };
    }
    // --- Empty Filter Creation ---
    createEmptyFilter(extraDefaults: Partial<T> = {}): T {
        const base: CasesFilterRequest = {
            status: null,
            caseType: null,
            caseCode: null,
            gender: null,
            ageCategory: null,
            fullName: null,
            government: null,
            city: null,
            minAge: null,
            maxAge: null,
            fromDate: null,
            toDate: null,
            ageSort: null,
            dateSort: null,
            page: 1,
            pageSize: this.defaultPageSize,
        };
        return { ...base, ...extraDefaults } as T;
    }
    // --- Sanitize Filter ---
    sanitizeFilter(filter: CasesFilterRequest): CasesFilterRequest {
        const searchMapped = this.mapSearchValue(filter.fullName, filter.caseCode);
        return {
            ...filter,
            caseType: this.normalizeEnum(filter.caseType),
            caseCode: searchMapped.caseCode,
            gender: this.normalizeEnum(filter.gender),
            ageCategory: this.normalizeEnum(filter.ageCategory),
            fullName: searchMapped.fullName,
            government: this.normalizeText(filter.government),
            city: this.normalizeText(filter.city),
            minAge: this.normalizeNumber(filter.minAge),
            maxAge: this.normalizeNumber(filter.maxAge),
            fromDate: this.normalizeText(filter.fromDate),
            toDate: this.normalizeText(filter.toDate),
            ageSort: this.normalizeNumber(filter.ageSort),
            dateSort: this.normalizeNumber(filter.dateSort),
            page: 1,
            pageSize: this.pageSize(),
        };
    }
    // --- Action Handlers ---
    onFilterChange(newFilter: CasesFilterRequest, onFetch?: () => void, extraUpdates?: Partial<T>): void {
        this.filter.update((f) => ({
            ...f,
            ...this.sanitizeFilter(newFilter),
            ...(extraUpdates ?? {}),
            page: 1,
            pageSize: this.pageSize(),
        }));
        this.currentPage.set(1);
        if (onFetch) {
            onFetch();
        }
    }
    onFilterReset(onFetch?: () => void, extraResetFields?: Partial<T>): void {
        this.filter.set(this.createEmptyFilter(extraResetFields));
        this.currentPage.set(1);
        if (onFetch) {
            onFetch();
        }
    }
    onPageChange(page: number, onFetch?: () => void): void {
        this.currentPage.set(page);
        this.filter.update((f) => ({
            ...f,
            page,
            pageSize: this.pageSize(),
        }));
        if (onFetch) {
            onFetch();
        }
    }
}
export class FoundedFilterState extends CasesFilterState<CasesFilterRequest> {
    protected override mapSearchValue(fullName: string | null, caseCode: string | null): SearchValueMapping {
        const rawSearch = fullName || caseCode;
        return {
            fullName: this.normalizeText(rawSearch),
            caseCode: null,
        };
    }
}