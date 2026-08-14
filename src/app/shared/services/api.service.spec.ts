import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ApiService, FormDataOptions } from './api.service';
import { HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TestApiService extends ApiService {
  public testBuildParams<T extends object>(params: T): HttpParams {
    return this.buildParams(params);
  }

  public testBuildFormData(data: object, options?: FormDataOptions): FormData {
    return this.buildFormData(data, options);
  }

  public testGet<T>(url: string, params?: object) {
    return this.get<T>(url, params);
  }

  public testGetById<T>(url: string, id: string | number) {
    return this.getById<T>(url, id);
  }

  public testPost<T>(url: string, body: unknown, options?: object) {
    return this.post<T>(url, body, options);
  }

  public testPut<T>(url: string, body: unknown, options?: object) {
    return this.put<T>(url, body, options);
  }

  public testDelete<T>(url: string) {
    return this.delete<T>(url);
  }

  public testPostFormData<TResponse>(
    url: string,
    request: object,
    params?: object,
    options?: FormDataOptions
  ) {
    return this.postFormData<TResponse>(url, request, params, options);
  }

  public testPutFormData<TResponse>(
    url: string,
    request: object,
    options?: FormDataOptions
  ) {
    return this.putFormData<TResponse>(url, request, options);
  }
}

describe('ApiService', () => {
  let service: TestApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [TestApiService]
    });
    service = TestBed.inject(TestApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('buildParams()', () => {
    it('converts normal values correctly', () => {
      const params = service.testBuildParams({ page: 1, search: 'test', active: true });
      expect(params.get('page')).toBe('1');
      expect(params.get('search')).toBe('test');
      expect(params.get('active')).toBe('true');
    });

    it('ignores null values', () => {
      const params = service.testBuildParams({ search: null, page: 1 });
      expect(params.has('search')).toBe(false);
      expect(params.get('page')).toBe('1');
    });

    it('ignores undefined values', () => {
      const params = service.testBuildParams({ search: undefined, page: 1 });
      expect(params.has('search')).toBe(false);
      expect(params.get('page')).toBe('1');
    });

    it('ignores empty strings', () => {
      const params = service.testBuildParams({ search: '', page: 1 });
      expect(params.has('search')).toBe(false);
      expect(params.get('page')).toBe('1');
    });

    it('handles arrays correctly', () => {
      const params = service.testBuildParams({ ids: [1, 2, 3] });
      expect(params.getAll('ids')).toEqual(['1', '2', '3']);
    });

    it('ignores null/undefined items inside arrays', () => {
      const params = service.testBuildParams({ ids: [1, null, undefined, 2] });
      expect(params.getAll('ids')).toEqual(['1', '2']);
    });
  });

  describe('buildFormData()', () => {
    it('converts camelCase keys to PascalCase', () => {
      const formData = service.testBuildFormData({ firstName: 'Ahmed' });
      expect(formData.get('FirstName')).toBe('Ahmed');
      expect(formData.has('firstName')).toBe(false);
    });

    it('appends string values', () => {
      const formData = service.testBuildFormData({ name: 'Test' });
      expect(formData.get('Name')).toBe('Test');
    });

    it('appends numbers', () => {
      const formData = service.testBuildFormData({ age: 30 });
      expect(formData.get('Age')).toBe('30');
    });

    it('appends booleans', () => {
      const formData = service.testBuildFormData({ isActive: true });
      expect(formData.get('IsActive')).toBe('true');
    });

    it('appends single File correctly', () => {
      const file = new File([''], 'test.png');
      const formData = service.testBuildFormData({ primaryImage: file });
      const appended = formData.get('PrimaryImage') as File;
      expect(appended instanceof File).toBe(true);
      expect(appended.name).toBe('test.png');
    });

    it('appends multiple files using the same key', () => {
      const file1 = new File([''], 'test1.png');
      const file2 = new File([''], 'test2.png');
      const formData = service.testBuildFormData({ additionalImages: [file1, file2] });
      const files = formData.getAll('AdditionalImages') as File[];
      expect(files.length).toBe(2);
      expect(files[0] instanceof File).toBe(true);
      expect(files[0].name).toBe('test1.png');
      expect(files[1] instanceof File).toBe(true);
      expect(files[1].name).toBe('test2.png');
    });

    it('handles primitive arrays', () => {
      const formData = service.testBuildFormData({ ids: [1, 2, 3] });
      expect(formData.getAll('Ids')).toEqual(['1', '2', '3']);
    });

    it('handles empty arrays with sendEmptyArrays false', () => {
      const formData = service.testBuildFormData({ emptyList: [] }, { sendEmptyArrays: false });
      expect(formData.has('EmptyList')).toBe(false);
    });

    it('handles empty arrays with sendEmptyArrays true', () => {
      const formData = service.testBuildFormData({ emptyList: [] }, { sendEmptyArrays: true });
      expect(formData.get('EmptyList')).toBe('');
    });

    it('ignores null and undefined fields', () => {
      const formData = service.testBuildFormData({ name: 'Test', age: null, bio: undefined });
      expect(formData.has('Age')).toBe(false);
      expect(formData.has('Bio')).toBe(false);
      expect(formData.get('Name')).toBe('Test');
    });

    it('JSON stringifies nested objects', () => {
      const nested = { city: 'Cairo' };
      const formData = service.testBuildFormData({ address: nested });
      expect(formData.get('Address')).toBe(JSON.stringify(nested));
    });

    it('returns the same FormData instance if input is already FormData', () => {
      const inputForm = new FormData();
      inputForm.append('existing', 'value');
      const formData = service.testBuildFormData(inputForm);
      expect(formData).toBe(inputForm);
    });
  });

  describe('HTTP methods', () => {
    it('get() sends GET request', () => {
      service.testGet('/api/test', { search: 'test' }).subscribe();
      const req = httpMock.expectOne(r => r.url === '/api/test' && r.params.has('search'));
      expect(req.request.method).toBe('GET');
      req.flush({});
    });

    it('getById() creates correct URL', () => {
      service.testGetById('/api/test', 123).subscribe();
      const req = httpMock.expectOne('/api/test/123');
      expect(req.request.method).toBe('GET');
      req.flush({});
    });

    it('post() sends POST request', () => {
      const body = { data: 'test' };
      service.testPost('/api/test', body).subscribe();
      const req = httpMock.expectOne('/api/test');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(body);
      req.flush({});
    });

    it('put() sends PUT request', () => {
      const body = { data: 'test' };
      service.testPut('/api/test', body).subscribe();
      const req = httpMock.expectOne('/api/test');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(body);
      req.flush({});
    });

    it('delete() sends DELETE request', () => {
      service.testDelete('/api/test').subscribe();
      const req = httpMock.expectOne('/api/test');
      expect(req.request.method).toBe('DELETE');
      req.flush({});
    });

    it('postFormData() sends FormData body and query params', () => {
      service.testPostFormData('/api/test', { name: 'test' }, { q: '1' }).subscribe();
      const req = httpMock.expectOne(r => r.url === '/api/test' && r.params.get('q') === '1');
      expect(req.request.method).toBe('POST');
      expect(req.request.body instanceof FormData).toBe(true);
      expect((req.request.body as FormData).get('Name')).toBe('test');
      req.flush({});
    });

    it('putFormData() sends FormData body', () => {
      service.testPutFormData('/api/test', { name: 'test' }).subscribe();
      const req = httpMock.expectOne('/api/test');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body instanceof FormData).toBe(true);
      expect((req.request.body as FormData).get('Name')).toBe('test');
      req.flush({});
    });
    it('post() should pass options correctly', () => {
      service.testPost(
        '/api/test',
        { name: 'test' },
        { headers: { 'X-Test': 'true' } }
      ).subscribe();

      const req = httpMock.expectOne('/api/test');

      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('X-Test')).toBe('true');

      req.flush({});
    });
    it('get() should work without params', () => {
      service.testGet('/api/test').subscribe();

      const req = httpMock.expectOne('/api/test');

      expect(req.request.method).toBe('GET');
      expect(req.request.params.keys().length).toBe(0);

      req.flush({});
    });
  });
});
