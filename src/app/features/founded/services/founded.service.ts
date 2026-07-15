import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  FoundedHeaderQueryDTO,
  FoundPersonListItemDto,
  FoundedApiListItemDto,
  PostDetailsResponseDTO,
  PaginationResponseDto,
  ApiResponse,
} from '../models/founded.models';

@Injectable({ providedIn: 'root' })
export class FoundedService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.baseUrl}/api/Founded`;

  getAll(query: FoundedHeaderQueryDTO): Observable<PaginationResponseDto<FoundPersonListItemDto>> {
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
      .get<PaginationResponseDto<FoundedApiListItemDto>>(this.baseUrl, { params })
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

  private mapApiItemToUiItem(item: FoundedApiListItemDto): FoundPersonListItemDto {
    return {
      id: item.id,
      fullName: item.name,
      mainImage: item.image,
      age: item.age,
      ageCategory: item.age,
      foundDate: item.foundedAt,
    };
  }
}
