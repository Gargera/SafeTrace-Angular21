import { inject, Injectable } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';

import { CaseListItemResponse, CasesFilterRequest } from '../../../core/models/cases.model';
import { CaseType } from '../../../shared/enums/case-type';
import { AgeSort } from '../../../shared/enums/age-sort';
import { DateSort } from '../../../shared/enums/date-sort';
import { ApiResponse } from '../../../shared/models/responses/api-response.model';
import { PaginationResponse } from '../../../shared/models/responses/pagination-response.model';

import { UrgentCaseService } from '../../urgent-cases/services/urgent-case.service';
import { LongTermCaseService } from '../../long-term-cases/services/long-term-case.service';
import { UnknownCaseService } from '../../unknown-cases/services/unknown-case.service';

// ---------------------------------------------------------------------------
// Result shape returned to the component
// ---------------------------------------------------------------------------
export interface CasesPageResult {
    items: CaseListItemResponse[];
    totalCount: number;
    totalPages: number;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------
@Injectable({ providedIn: 'root' })
export class CasesManagementService {
    private readonly urgentService = inject(UrgentCaseService);
    private readonly longTermService = inject(LongTermCaseService);
    private readonly unknownService = inject(UnknownCaseService);

    // -------------------------------------------------------------------------
    // Public API
    // -------------------------------------------------------------------------

    /**
     * Load a page of cases, applying the supplied filter.
     * When filter.caseType is set, only that type is fetched from the backend.
     * When it is null/undefined, all three types are fetched simultaneously,
     * merged, sorted by createdAt descending, and paginated client-side.
     */
    getCases(
        filter: CasesFilterRequest,
        page: number,
        pageSize: number,
    ): Observable<CasesPageResult> {
        const type = filter.caseType;

        if (type !== null && type !== undefined) {
            return this.getCasesByType(type, filter, page, pageSize);
        }

        return this.getAllCasesCombined(filter, page, pageSize);
    }

    /**
     * Delete a case, automatically routing to the correct API based on caseType.
     */
    deleteCase(caseId: number, caseType: CaseType): Observable<ApiResponse<string>> {
        return this.getCaseService(caseType).deleteCase(caseId);
    }

    /**
     * Resolve the domain service responsible for the given CaseType.
     * Exposed publicly so other dashboard pages can reuse the routing logic.
     */
    getCaseService(
        caseType: CaseType,
    ): UrgentCaseService | LongTermCaseService | UnknownCaseService {
        switch (caseType) {
            case CaseType.Urgent:
                return this.urgentService;
            case CaseType.LongTerm:
                return this.longTermService;
            case CaseType.Unknown:
                return this.unknownService;
            default:
                throw new Error(`Unknown CaseType: ${caseType}`);
        }
    }

    // -------------------------------------------------------------------------
    // Private – loading strategies
    // -------------------------------------------------------------------------

    /** Fetch a single case type from the backend and map the result. */
    private getCasesByType(
        type: CaseType,
        filter: CasesFilterRequest,
        page: number,
        pageSize: number,
    ): Observable<CasesPageResult> {
        const service = this.getCaseService(type);
        const request: any = { ...filter, page, pageSize };

        // UrgentCase requires geo fields; provide safe defaults when absent.
        if (type === CaseType.Urgent) {
            request.latitude = request.latitude ?? null;
            request.longitude = request.longitude ?? null;
            request.radiusInKm = request.radiusInKm ?? null;
        }

        return (
            service.adminGetAllCases(request) as Observable<
                ApiResponse<PaginationResponse<any>>
            >
        ).pipe(
            map((res) => {
                if (!res.success || !res.data) {
                    return { items: [], totalCount: 0, totalPages: 0 };
                }

                const pagination = res.data;
                const items = (pagination.items ?? []).map((item: any) =>
                    this.mapToCaseListItem(item, type),
                );

                return {
                    items,
                    totalCount: pagination.totalCount ?? 0,
                    totalPages: pagination.totalPages ?? 0,
                };
            }),
        );
    }

    /**
     * Fetch all three case types simultaneously using forkJoin, merge the
     * results, sort according to the active filter (ageSort / dateSort, falling
     * back to createdAt DESC), then paginate client-side.
     */
    private getAllCasesCombined(
        filter: CasesFilterRequest,
        page: number,
        pageSize: number,
    ): Observable<CasesPageResult> {
        // Over-fetch so client-side pagination has enough items across all types.
        const fetchSize = pageSize * 3;
        const baseFilter = { ...filter, page: 1, pageSize: fetchSize };

        const urgent$ = this.urgentService.adminGetAllCases({
            ...baseFilter,
            latitude: null,
            longitude: null,
            radiusInKm: null,
        });
        const longTerm$ = this.longTermService.adminGetAllCases(baseFilter);
        const unknown$ = this.unknownService.adminGetAllCases(baseFilter);

        return forkJoin([urgent$, longTerm$, unknown$]).pipe(
            map(([urgentRes, longTermRes, unknownRes]) => {
                const responses = [
                    { res: urgentRes, type: CaseType.Urgent },
                    { res: longTermRes, type: CaseType.LongTerm },
                    { res: unknownRes, type: CaseType.Unknown },
                ] as const;

                let allItems: CaseListItemResponse[] = [];
                let totalCount = 0;

                for (const { res, type } of responses) {
                    if (res?.success && res.data) {
                        const mapped = (res.data.items ?? []).map((item: any) =>
                            this.mapToCaseListItem(item, type),
                        );
                        allItems = allItems.concat(mapped);
                        totalCount += res.data.totalCount ?? 0;
                    }
                }

                // Sort respecting the active filter before paginating.
                this.sortItems(allItems, filter);

                // Client-side pagination slice.
                const start = (page - 1) * pageSize;
                const paginatedItems = allItems.slice(start, start + pageSize);

                return {
                    items: paginatedItems,
                    totalCount,
                    totalPages: Math.ceil(totalCount / pageSize),
                };
            }),
        );
    }

    /**
     * Sort items in-place according to the active sort filter.
     *
     * Priority:
     *  1. ageSort  — if set, sort by age (Ascending = youngest first,
     *                Descending = oldest first).
     *  2. dateSort — if set, sort by createdAt (Ascending = oldest first,
     *                Descending = newest first).
     *  3. Fallback — createdAt DESC (newest first) when neither is set.
     *
     * ageSort takes precedence over dateSort when both are present,
     * matching typical single-type backend behaviour.
     */
    private sortItems(items: CaseListItemResponse[], filter: CasesFilterRequest): void {
        if (filter.ageSort !== null && filter.ageSort !== undefined) {
            const direction = filter.ageSort === AgeSort.Ascending ? 1 : -1;
            items.sort((a, b) => (a.age - b.age) * direction);
            return;
        }

        if (filter.dateSort !== null && filter.dateSort !== undefined) {
            const direction = filter.dateSort === DateSort.Ascending ? 1 : -1;
            items.sort(
                (a, b) =>
                    (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * direction,
            );
            return;
        }

        // Default: newest first.
        items.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
    }

    // -------------------------------------------------------------------------
    // Private – DTO mapping
    // -------------------------------------------------------------------------

    /**
     * Normalise any case DTO variant (Urgent/LongTerm/Unknown detail or list)
     * into the shared CaseListItemResponse shape used by the UI.
     * The component never needs to know how individual DTOs differ.
     */
    private mapToCaseListItem(item: any, caseType: CaseType): CaseListItemResponse {
        return {
            id: item.id,
            caseCode: item.caseCode,
            caseType,
            status: item.status,
            fName: item.fName ?? null,
            sName: item.sName ?? null,
            tName: item.tName ?? null,
            lName: item.lName ?? null,
            gender: item.gender,
            age: item.age,
            city: item.city,
            government: item.government,
            createdAt: item.createdAt,
            mainPhoto: item.mainPhoto || item.mainImageUrl || '',
        };
    }
}
