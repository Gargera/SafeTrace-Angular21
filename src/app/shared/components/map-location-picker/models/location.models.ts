export interface LocationResult {
  lat: number;
  lng: number;
  address: string;
}

export interface MapCoordinates {
  lat: number;
  lng: number;
}

export interface SearchResult {
  lat: number;
  lng: number;
  displayName: string;
}

export interface MapState {
  lat: number | null;
  lng: number | null;
  address: string;
  isMapLoading: boolean;
  isReverseGeocoding: boolean;
  isLocatingModal: boolean;
  isFullscreen: boolean;
  searchQuery: string;
  searchResults: SearchResult[];
  selectedIndex: number;
  isSearching: boolean;
  hasSearched: boolean;
}
