export interface GeocodeAddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

export interface NominatimReverseResponse {
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

export interface PlaceSearchResult {
  lat: number;
  lng: number;
  displayName: string;
}
