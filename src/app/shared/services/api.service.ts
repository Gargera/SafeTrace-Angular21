import { inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface FormDataOptions {
  /**
   * If true, empty arrays will be appended as an empty string (e.g. `Key: ''`).
   * This is useful for ASP.NET Core model binding which might otherwise treat the omitted array as null.
   * Default is false to prevent breaking standard APIs.
   */
  sendEmptyArrays?: boolean;
}

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
   * Converts a strongly typed object into FormData.
   *
   * @remarks
   * - PascalCase Conversion: ASP.NET Core default model binding expects PascalCase properties.
   *   We automatically capitalize the first letter (e.g., `primaryImage` -> `PrimaryImage`).
   * - Empty Arrays: Optional via `FormDataOptions`. If `sendEmptyArrays` is true, empty arrays
   *   send an empty string to prevent .NET from assuming the entire collection is null.
   * - File Arrays: `IFormFile` arrays in ASP.NET Core require multiple form fields with the same name
   *   (e.g., `AdditionalImages=file1`, `AdditionalImages=file2`).
   */
  protected buildFormData(
    data: object,
    options?: FormDataOptions
  ): FormData {
    if (data instanceof FormData) {
      return data;
    }

    const formData = new FormData();
    if (!data) return formData;

    Object.entries(data).forEach(([key, value]) => {
      // Ignore null and undefined values completely
      if (value === null || value === undefined) {
        return;
      }

      // Convert property name to PascalCase for .NET compatibility
      const pascalKey = key.charAt(0).toUpperCase() + key.slice(1);

      // Handle single File (e.g. IFormFile PrimaryImage)
      if (value instanceof File) {
        formData.append(pascalKey, value, value.name);
        return;
      }

      // Handle Arrays (e.g. List<IFormFile> AdditionalImages, or List<int> Ids)
      if (Array.isArray(value)) {
        if (value.length === 0) {
          if (options?.sendEmptyArrays) {
            formData.append(pascalKey, '');
          }
          return;
        }

        value.forEach(item => {
          if (item === null || item === undefined) {
            return;
          }

          if (item instanceof File) {
            // Append multiple times for ASP.NET List<IFormFile> binding
            formData.append(pascalKey, item, item.name);
          } else if (typeof item === 'object') {
            // Complex nested objects within arrays are JSON stringified
            formData.append(pascalKey, JSON.stringify(item));
          } else {
            // Primitive arrays (e.g. List<int> Ids)
            formData.append(pascalKey, item.toString());
          }
        });
        return;
      }

      // Handle nested complex objects
      if (typeof value === 'object') {
        formData.append(pascalKey, JSON.stringify(value));
        return;
      }

      // Handle primitive types (string, number, boolean)
      formData.append(pascalKey, value.toString());
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

  protected post<T>(url: string, body: unknown, options?: object): Observable<T> {
    return this.http.post<T>(url, body, options);
  }

  protected put<T>(url: string, body: unknown, options?: object): Observable<T> {
    return this.http.put<T>(url, body, options);
  }

  protected delete<T>(url: string): Observable<T> {
    return this.http.delete<T>(url);
  }

  protected postFormData<TResponse>(
    url: string,
    request: object,
    params?: object,
    options?: FormDataOptions
  ): Observable<TResponse> {
    const httpParams = params ? this.buildParams(params) : undefined;
    const body = this.buildFormData(request, options);

    return this.http.post<TResponse>(url, body, {
      params: httpParams
    });
  }

  protected putFormData<TResponse>(
    url: string,
    request: object,
    options?: FormDataOptions
  ): Observable<TResponse> {
    const body = this.buildFormData(request, options);
    return this.http.put<TResponse>(url, body);
  }
}