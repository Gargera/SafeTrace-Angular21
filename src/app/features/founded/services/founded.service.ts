import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment.development';
import {
  FoundedHeaderQueryDTO,
  FoundedApiListItemDto,
  PostDetailsResponseDTO,
} from '../models/founded.models';
import { PaginationResponse } from '../../../shared/models/responses/pagination-response.model';
import { ApiResponse } from '../../../shared/models/responses/api-response.model';
import { CaseListItemResponse } from '../../../core/models/Cases.model';
import { CaseStatus } from '../../../shared/enums/case-status';
import { CaseType } from '../../../shared/enums/case-type';
import { Gender } from '../../../shared/enums/gender';

@Injectable({ providedIn: 'root' })
export class FoundedService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.baseUrl}/api/Founded`;

  getAll(query: FoundedHeaderQueryDTO): Observable<PaginationResponse<CaseListItemResponse>> {
    let params = new HttpParams()
      .set('page', query.page.toString())
      .set('pageSize', query.pageSize.toString());

    if (query.search) params = params.set('search', query.search);
    if (query.ageCategory) params = params.set('ageCategory', query.ageCategory.toString());
    if (query.caseType !== null && query.caseType !== undefined)
      params = params.set('caseType', query.caseType.toString());
    if (query.gender !== null && query.gender !== undefined)
      params = params.set('gender', query.gender.toString());

    return this.http
      .get<PaginationResponse<FoundedApiListItemDto>>(this.baseUrl, { params })
      .pipe(
        map((res) => ({
          ...res,
          items: res.items.map((item) => this.mapApiItemToUiItem(item)),
        })),
      );
  }

  getDetails(id: number): Observable<ApiResponse<PostDetailsResponseDTO>> {
    return this.http.get<ApiResponse<PostDetailsResponseDTO>>(`${this.baseUrl}/${id}`);
  }

  private mapApiItemToUiItem(item: FoundedApiListItemDto): CaseListItemResponse {
    return {
      id: item.caseId || item.id,
      caseCode: '', // N/A
      caseType: CaseType.Unknown, // default/dummy
      status: CaseStatus.Found, // dummy
      fName: item.name,
      sName: null,
      tName: null,
      lName: null,
      gender: Gender.Male, // default since the API list doesn't return gender
      age: parseInt(item.age) || 0,
      city: '',
      government: '',
      createdAt: item.foundedAt,
      mainPhoto: item.image,
    };
  }
}

