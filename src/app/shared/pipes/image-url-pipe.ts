import { Pipe, PipeTransform } from '@angular/core';
import { environment } from '../../../environments/environment';

@Pipe({
  name: 'imageUrl',
  standalone: true
})
export class ImageUrlPipe implements PipeTransform {
  transform(imagePath: string | null | undefined): string {
    if (!imagePath) return 'assets/images/default-placeholder.png';
    
    const baseUrl = environment.filesBaseUrl.endsWith('/') ? environment.filesBaseUrl : `${environment.filesBaseUrl}/`;
    const cleanPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
    
    return baseUrl + cleanPath;
  }
}