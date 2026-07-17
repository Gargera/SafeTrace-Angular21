import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

declare const google: any;

interface GeocodeAddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

@Injectable({ providedIn: 'root' })
export class GeocodingService {
  reverseGeocode(lat: number, lng: number): Observable<string> {
    return new Observable((observer) => {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results: any, status: string) => {
        if (status === 'OK' && results && results.length > 0) {
          const short = this.buildShortAddress(results[0].address_components);
          observer.next(short ?? results[0].formatted_address);
        } else {
          observer.next(this.coordsFallback(lat, lng));
        }
        observer.complete();
      });
    });
  }

  forwardGeocode(address: string): Observable<{ lat: number; lng: number } | null> {
    return new Observable((observer) => {
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

  /** يربط Places Autocomplete بحقل input، وينده onPlace لما اليوزر يختار مكان */
  attachAutocomplete(
    input: HTMLInputElement,
    onPlace: (result: { lat: number; lng: number; address: string }) => void
  ): void {
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

  private coordsFallback(lat: number, lng: number): string {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}