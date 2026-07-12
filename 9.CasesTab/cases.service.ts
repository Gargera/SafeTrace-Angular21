import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment'; // ASSUMPTION: adjust path to your real environment file
import { CaseType } from '../enums/case-type';
import {
  ApiResponse,
  CasesFilterBase,
  MyCaseListItemDto,
  PaginationResponseDto,
  UrgentCasesFilter,
} from './my-cases.model';

@Injectable({ providedIn: 'root' })
export class MyCasesService {
  readonly #http = inject(HttpClient);
  readonly #baseUrl = environment.apiUrl; // ASSUMPTION: e.g. environment.apiUrl = 'https://api.safetrace.com/api'

  // ASSUMPTION: one controller per case type, route = api/[controller] convention:
  // api/LongTermCases, api/UrgentCases, api/UnknownCases
  #controllerFor(type: CaseType): string {
    switch (type) {
      case CaseType.LongTerm:
        return 'LongTermCases';
      case CaseType.Urgent:
        return 'UrgentCases';
      case CaseType.Unknown:
        return 'UnknownCases';
    }
  }

  getMyCases(
    type: CaseType,
    filter: CasesFilterBase | UrgentCasesFilter
  ): Observable<ApiResponse<PaginationResponseDto<MyCaseListItemDto>>> {
    const url = `${this.#baseUrl}/${this.#controllerFor(type)}/GetMyCases`;
    let params = new HttpParams();

    Object.entries(filter).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });

    return this.#http.get<ApiResponse<PaginationResponseDto<MyCaseListItemDto>>>(url, { params });
  }

  getCaseDetails(type: CaseType, id: number): Observable<ApiResponse<MyCaseListItemDto>> {
    const url = `${this.#baseUrl}/${this.#controllerFor(type)}/GetCaseDetails/${id}`;
    return this.#http.get<ApiResponse<MyCaseListItemDto>>(url);
  }
}
