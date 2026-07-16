import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../../../environments/environment';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

@Injectable({
  providedIn: 'root',
})
export class PaymentService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiBaseUrl}/Payment`;

  getPaymentResult(queryParams: Record<string, any>): Observable<ApiResponse<string>> {
    let params = new HttpParams();

    Object.keys(queryParams).forEach((key) => {
      const value = queryParams[key];

      if (value !== null && value !== undefined) {
        params = params.set(key, value);
      }
    });

    return this.http.get<ApiResponse<string>>(`${this.apiUrl}/payment-result`, { params });
  }
}
