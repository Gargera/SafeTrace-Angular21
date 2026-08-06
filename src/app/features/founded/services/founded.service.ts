import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { FoundedHeaderQueryDTO } from '../models/requests/founded-header-query-dto';
import { FoundPersonListItemDto } from '../models/responses/found-person-list-item-dto';
import { FoundedApiListItemDto } from '../models/responses/founded-api-list-item-dto';
import { PostDetailsResponseDTO } from '../models/responses/post-details-response-dto';
import { PaginationResponse } from '../../../shared/models/responses/pagination-response.model';
import { ApiResponse } from '../../../shared/models/responses/api-response.model';
import { getAgeCategory } from '../../../shared/helper/age-category.helper';
import { ApiService } from '../../../shared/services/api.service';
import { CaseType } from '../../../shared/enums/case-type';

@Injectable({ providedIn: 'root' })
export class FoundedService extends ApiService {
  private readonly baseUrl = `${environment.baseUrl}/api/Founded`;

  getAll(query: FoundedHeaderQueryDTO): Observable<PaginationResponse<FoundPersonListItemDto>> {
    return this.get<PaginationResponse<FoundedApiListItemDto>>(this.baseUrl, query).pipe(
      map((res) => ({
        ...res,
        items: res.items.map((item) => this.mapApiItemToUiItem(item)),
      })),
    );
  }

  getDetails(id: number): Observable<ApiResponse<PostDetailsResponseDTO>> {
    return this.getById<ApiResponse<PostDetailsResponseDTO>>(this.baseUrl, id);
  }

  private mapApiItemToUiItem(item: FoundedApiListItemDto): FoundPersonListItemDto {
    return {
      id: item.id,
      fullName: item.name,
      mainImage: item.image,
      age: item.age,
      caseType: item.caseType as CaseType,
      ageCategory: getAgeCategory(item.age),
      foundDate: item.foundedAt,
    };
  }
}
