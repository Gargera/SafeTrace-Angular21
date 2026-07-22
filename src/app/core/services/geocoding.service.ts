import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { UpdateCurrentLocationDTO } from '../../features/user-profile/model/profile.model';
import { ProfileService } from '../../features/user-profile/service/profile.service';

declare const google: any;

interface GeocodeAddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

interface NominatimReverseResponse {
  display_name: string;
  address: {
    road?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
  };
  error?: string;
}

interface CacheEntry {
  address: string;
}

const PRECISION = 4;

@Injectable({ providedIn: 'root' })
export class GeocodingService {
  readonly #http = inject(HttpClient);

  // ⚠️ تم حذف هيدر "User-Agent" لأن المتصفح يمنع الـ JS من التحكم فيه
  // (Forbidden header name حسب Fetch/XHR spec)، وأي محاولة لضبطه بتطلع
  // "Refused to set unsafe header" في الـ console. لو محتاج تعرّف نفسك
  // لسياسة استخدام Nominatim، الطريقة الصح هي تبعت الطلبات من Backend
  // بتاعك بدل الـ Frontend مباشرة.
  readonly #headers = new HttpHeaders({
    'Accept-Language': 'ar', // جلب النتائج بالعربية دائماً
  });

  readonly #cache = new Map<string, CacheEntry>();

  /**
   * تم تحويلها لتعمل عبر Nominatim مجاناً وبدون تعقيد.
   * ستعمل تلقائياً لصفحتك وصفحة الـ Profile لزميلك دون أن يغير كوده.
   */
  reverseGeocode(lat: number, lng: number): Observable<string> {
    const key = this.#cacheKey(lat, lng);
    const cached = this.#cache.get(key);
    if (cached) {
      return of(cached.address);
    }

    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;

    return this.#http.get<NominatimReverseResponse>(url, { headers: this.#headers }).pipe(
      map((response) => {
        if (response.error) {
          return this.#fallback(lat, lng);
        }

        const a = response.address;
        const parts = [a.suburb, a.city ?? a.town ?? a.village, a.state, a.country].filter(Boolean);

        const address = parts.length > 0 ? parts.join('، ') : response.display_name;

        this.#cache.set(key, { address });
        return address;
      }),
      catchError(() => of(this.#fallback(lat, lng)))
    );
  }

  /**
   * كود الـ Forward Geocode الخاص بجوجل (متروك كما هو لزميلك إذا احتاج إليه)
   */
  forwardGeocode(address: string): Observable<{ lat: number; lng: number } | null> {
    return new Observable((observer) => {
      if (typeof google === 'undefined' || !google.maps) {
        observer.next(null);
        observer.complete();
        return;
      }
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ address, region: 'EG' }, (results: any, status: string) => {
        if (status === 'OK' && results && results.length > 0) {
          const location = results[0].geometry.location;
          observer.next({ lat: location.lat(), lng: location.lng() });
        } else {
          observer.next(null);
        }
        observer.complete();
      });
    });
  }

  /**
   * ربط حقل الإدخال بالـ Autocomplete (متروك كما هو لزميلك)
   */
  attachAutocomplete(
    input: HTMLInputElement,
    onPlace: (result: { lat: number; lng: number; address: string }) => void
  ): void {
    if (typeof google === 'undefined' || !google.maps || !google.maps.places) return;

    const autocomplete = new google.maps.places.Autocomplete(input, {
      componentRestrictions: { country: 'eg' },
      fields: ['geometry', 'formatted_address'],
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (!place.geometry?.location) return;

      onPlace({
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
        address: place.formatted_address ?? '',
      });
    });
  }

  private buildShortAddress(components: GeocodeAddressComponent[]): string | null {
    const find = (...types: string[]): string | undefined =>
      components.find((c) => types.some((t) => c.types.includes(t)))?.long_name;

    const district = find('sublocality_level_1', 'sublocality', 'neighborhood', 'locality');
    const governorate = find('administrative_area_level_1');
    const country = find('country');

    const parts = [district, governorate, country].filter((p): p is string => !!p);
    const unique = parts.filter((p, i) => parts.indexOf(p) === i);
    return unique.length ? unique.join('، ') : null;
  }

  #cacheKey(lat: number, lng: number): string {
    return `${lat.toFixed(PRECISION)},${lng.toFixed(PRECISION)}`;
  }

  #fallback(lat: number, lng: number): string {
    return `${lat.toFixed(PRECISION)}, ${lng.toFixed(PRECISION)}`;
  }

  
}