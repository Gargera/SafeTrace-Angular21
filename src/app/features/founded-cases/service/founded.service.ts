import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { FoundedApiResponse, FoundedFilter } from '../models/founded-model';
import { environment } from '../../../../environments/environment.development';

@Injectable({
  providedIn: 'root',
})
export class FoundedService {
  private readonly apiUrl = environment.baseUrl + '/api/founded'; // Adjust the endpoint as needed

  constructor(private http: HttpClient) {}

  getFoundedPersons(filter: FoundedFilter): Observable<FoundedApiResponse> {
    let params = new HttpParams()
      .set('page', filter.page.toString())
      .set('pageSize', filter.pageSize.toString());

    // Only send ageCategory if it's not "all" (0)
    if (filter.ageCategory && filter.ageCategory !== 0) {
      params = params.set('ageCategory', filter.ageCategory.toString());
    }

    // Only send gender if selected
    if (filter.gender) {
      params = params.set('gender', filter.gender);
    }

    // Only send search if not empty
    if (filter.search?.trim()) {
      params = params.set('search', filter.search.trim());
    }

    console.log('📤 Request params:', params.toString());

    return this.http
      .get<FoundedApiResponse>(this.apiUrl, { params })
      .pipe(tap((res) => console.log('📥 Raw HTTP response:', JSON.stringify(res, null, 2))));
  }

  getImageUrl(imagePath: string | null): string {
    // if (!imagePath) return 'assets/images/placeholder-person.png';
    return `${environment.baseUrl}/${imagePath}`;
  }
}
