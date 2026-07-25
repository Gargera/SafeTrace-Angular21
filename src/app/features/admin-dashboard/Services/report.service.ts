import { Injectable, inject } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserFilterDto } from '../models/User/UserFilterDto';

@Injectable({
  providedIn: 'root',
})

export class ReportService {
  private readonly baseUrl = `${environment.baseUrl}/api`;
    private http = inject(HttpClient);


  generateUsersPdfReport(filter: UserFilterDto): Observable<HttpResponse<Blob>> {
  return this.http.post(
    `${this.baseUrl}/Users/report/pdf`,
    filter,
    {
      responseType: 'blob',
      observe: 'response'
    }
  );
}
download(response: HttpResponse<Blob>): void {

    const blob = response.body;

    if (!blob) return;

    let fileName = 'download';

  const contentDisposition =
    response.headers.get('Content-Disposition');

  if (contentDisposition) {

    const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/);

    const normalMatch = contentDisposition.match(/filename="?([^";]+)"?/);

    if (utf8Match) {
      fileName = decodeURIComponent(utf8Match[1]);
    }
    else if (normalMatch) {
      fileName = normalMatch[1];
    }
  }


    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');

    link.href = url;
    link.download = fileName;

    link.click();

    URL.revokeObjectURL(url);
  }
}
