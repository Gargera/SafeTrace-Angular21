// import { Injectable, inject } from '@angular/core';
// import { Observable, of } from 'rxjs';

// interface GeocodeAddressComponent {
//   long_name: string;
//   short_name: string;
//   types: string[];
// }

// interface GeocodeResult {
//   formatted_address: string;
//   address_components: GeocodeAddressComponent[];
//   geometry: { location: { lat: number; lng: number } };
// }

// interface GeocodeResponse {
//   status: string;
//   results: GeocodeResult[];
// }

// @Injectable({ providedIn: 'root' })
// export class GeocodingService {
//   /**
//    * Reverse geocode: converts lat/lng coordinates into a short, human-readable
//    * Arabic address of the form "الحي، المحافظة، الدولة"
//    * e.g. "مدينة نصر، القاهرة، مصر"
//    *
//    * Falls back to raw coordinates if Google returns nothing usable or errors out.
//    * Requires: Geocoding API enabled on the API key used here.
//    */
//   reverseGeocode(lat: number, lng: number): Observable<string> {
//     return new Observable((observer) => {
//       const geocoder = new google.maps.Geocoder();

//       geocoder.geocode(
//         {
//           location: { lat, lng },
//         },
//         (results, status) => {
//           if (status === 'OK' && results && results.length > 0) {
//             const short = this.#buildShortAddress(results[0].address_components as any);

//             observer.next(short ?? results[0].formatted_address);
//           } else {
//             observer.next(this.#coordsFallback(lat, lng));
//           }

//           observer.complete();
//         },
//       );
//     });
//   }

//   /**
//    * Builds "District، Governorate، Country" from Google's address_components.
//    *   - District    : sublocality_level_1 / sublocality / neighborhood / locality
//    *   - Governorate : administrative_area_level_1
//    *   - Country     : country
//    * Returns null if nothing usable was found (caller falls back to formatted_address).
//    */
//   #buildShortAddress(components: GeocodeAddressComponent[]): string | null {
//     const find = (...types: string[]): string | undefined =>
//       components.find((c) => types.some((t) => c.types.includes(t)))?.long_name;

//     const district = find('sublocality_level_1', 'sublocality', 'neighborhood', 'locality');
//     const governorate = find('administrative_area_level_1');
//     const country = find('country');

//     const parts = [district, governorate, country].filter((p): p is string => !!p);
//     // Avoid "القاهرة، القاهرة، مصر" when district === governorate
//     const unique = parts.filter((p, i) => parts.indexOf(p) === i);

//     return unique.length ? unique.join('، ') : null;
//   }

//   #coordsFallback(lat: number, lng: number): string {
//     return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
//   }

//   /**
//    * Forward geocode: converts an address string to lat/lng.
//    * Requires: Geocoding API enabled on the API key used here.
//    */
//   forwardGeocode(address: string): Observable<{ lat: number; lng: number } | null> {
//     return new Observable((observer) => {
//       const geocoder = new google.maps.Geocoder();

//       geocoder.geocode(
//         {
//           address: address,
//           region: 'EG',
//         },
//         (results, status) => {
//           if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
//             const location = results[0].geometry.location;

//             observer.next({
//               lat: location.lat(),
//               lng: location.lng(),
//             });
//           } else {
//             observer.next(null);
//           }

//           observer.complete();
//         },
//       );
//     });
//   }
// }
