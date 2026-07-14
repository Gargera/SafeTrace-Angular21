import { inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export abstract class ApiService {
  protected readonly http = inject(HttpClient);

  /**
   * Build HttpParams from any object.
   * Ignores null, undefined and empty strings.
   */
  protected buildParams<T extends object>(params: T): HttpParams {
    let httpParams = new HttpParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        return;
      }

      if (Array.isArray(value)) {
        value.forEach(item => {
          if (item !== null && item !== undefined) {
            httpParams = httpParams.append(key, item.toString());
          }
        });

        return;
      }

      httpParams = httpParams.set(key, value.toString());
    });

    return httpParams;
  }

  /**
   * Converts any object into FormData.
   * Supports:
   * - primitives
   * - File
   * - File[]
   * - primitive arrays
   * - nested objects
   */
  protected buildFormData(data: Record<string, any>): FormData {
    const formData = new FormData();

    Object.entries(data).forEach(([key, value]) => {

      if (value === null || value === undefined) {
        return;
      }

      // Single file
      if (value instanceof File) {
        formData.append(key, value);
        return;
      }

      // Arrays
      if (Array.isArray(value)) {

        value.forEach(item => {

          if (item === null || item === undefined) {
            return;
          }

          if (item instanceof File) {
            formData.append(key, item);
          } else if (typeof item === 'object') {
            formData.append(key, JSON.stringify(item));
          } else {
            formData.append(key, item.toString());
          }

        });

        return;
      }

      // Nested object
      if (typeof value === 'object') {
        formData.append(key, JSON.stringify(value));
        return;
      }

      // Primitive
      formData.append(key, value.toString());

    });

    return formData;
  }

  protected get<T>(url: string, params?: object): Observable<T> {
    return this.http.get<T>(url, {
      params: params ? this.buildParams(params) : undefined
    });
  }

  protected getById<T>(url: string, id: string | number): Observable<T> {
    return this.http.get<T>(`${url}/${id}`);
  }

  protected post<T>(url: string, body: unknown): Observable<T> {
    return this.http.post<T>(url, body);
  }

  protected put<T>(url: string, body: unknown): Observable<T> {
    return this.http.put<T>(url, body);
  }

  protected delete<T>(url: string): Observable<T> {
    return this.http.delete<T>(url);
  }

  protected postFormData<T>(url: string, request: object): Observable<T> {
    return this.http.post<T>(url, this.buildFormData(request));
  }

  protected putFormData<T>(url: string, request: object): Observable<T> {
    return this.http.put<T>(url, this.buildFormData(request));
  }
}