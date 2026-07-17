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
   * Converts first letter of keys to PascalCase for .NET compatibility.
   */
  protected buildFormData(data: any): FormData {
    // إذا كان الكائن الممرر هو بالفعل FormData، نقوم بإرجاعه مباشرة دون تعديل
    if (data instanceof FormData) {
      return data;
    }

    const formData = new FormData();
    if (!data) return formData;

    Object.entries(data).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        return;
      }

      // تحويل الحرف الأول إلى Capital (PascalCase) ليتوافق مع الـ C# Backend
      const pascalKey = key.charAt(0).toUpperCase() + key.slice(1);

      // 1. التعامل مع الملفات الفردية
      if (value instanceof File) {
        formData.append(pascalKey, value, value.name);
        return;
      }

      // 2. التعامل مع المصفوفات (مثل مصفوفة الصور الإضافية)
      if (Array.isArray(value)) {
        value.forEach(item => {
          if (item === null || item === undefined) {
            return;
          }

          if (item instanceof File) {
            formData.append(pascalKey, item, item.name);
          } else if (typeof item === 'object') {
            formData.append(pascalKey, JSON.stringify(item));
          } else {
            formData.append(pascalKey, item.toString());
          }
        });
        return;
      }

      // 3. التعامل مع الكائنات المتداخلة (Nested objects)
      if (typeof value === 'object') {
        formData.append(pascalKey, JSON.stringify(value));
        return;
      }

      // 4. القيم العادية الأخرى (Primitives)
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

  protected post<T>(url: string, body: unknown): Observable<T> {
    return this.http.post<T>(url, body);
  }

  protected put<T>(url: string, body: unknown): Observable<T> {
    return this.http.put<T>(url, body);
  }

  protected delete<T>(url: string): Observable<T> {
    return this.http.delete<T>(url);
  }

  /**
   * Sends POST request with FormData and appends query parameters if provided.
   */
  protected postFormData<T>(url: string, request: any, params?: any): Observable<T> {
    const httpParams = params ? this.buildParams(params) : undefined;
    const body = this.buildFormData(request);
    
    return this.http.post<T>(url, body, {
      params: httpParams
    });
  }

  /**
   * Sends PUT request with FormData.
   */
  protected putFormData<T>(url: string, request: any): Observable<T> {
    const body = this.buildFormData(request);
    return this.http.put<T>(url, body);
  }
}