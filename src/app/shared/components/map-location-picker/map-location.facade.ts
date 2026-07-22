import { Injectable, inject, signal, computed, DestroyRef } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import * as L from 'leaflet';

import { MapState, SearchResult, LocationResult } from './map-location-picker.types';
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_ZOOM,
  RECENTER_ZOOM,
  SEARCH_DEBOUNCE_MS,
  MAP_INIT_DELAY_MS,
  LOCATION_SAFETY_GUARD_MS,
} from './map-location-picker.constants';
import { formatCoordinates } from './map-location-picker.utils';

import { LeafletMapService } from './leaflet-map.service';
import { CurrentLocationService } from './current-location.service';
import { ReverseGeocodeService } from './reverse-geocode.service';
import { LocationSearchService } from './location-search.service';

@Injectable()
export class MapLocationFacade {
  private readonly leafletMapService = inject(LeafletMapService);
  private readonly currentLocationService = inject(CurrentLocationService);
  private readonly reverseGeocodeService = inject(ReverseGeocodeService);
  private readonly locationSearchService = inject(LocationSearchService);
  private readonly destroyRef = inject(DestroyRef);

  private map: L.Map | null = null;
  private marker: L.Marker | null = null;
  private resizeObserver?: ResizeObserver;
  private initTimeout: any = null;

  private readonly searchSubject$ = new Subject<string>();
  private readonly resolveAddressSubject$ = new Subject<{ lat: number; lng: number }>();

  readonly state = signal<MapState>({
    lat: null,
    lng: null,
    address: '',
    isMapLoading: true,
    isReverseGeocoding: false,
    isLocatingModal: false,
    isFullscreen: false,
    searchQuery: '',
    searchResults: [],
    selectedIndex: -1,
    isSearching: false,
    hasSearched: false,
  });

  readonly isConfirmDisabled = computed(() => {
    const s = this.state();
    return s.lat === null || s.lng === null || s.isReverseGeocoding;
  });

  readonly containerClasses = computed(() =>
    this.state().isFullscreen
      ? 'fixed inset-0 z-50 flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl transition-all duration-300'
      : 'relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl transition-all duration-300 animate-in zoom-in-95'
  );

  readonly formattedCoordinates = computed(() =>
    formatCoordinates(this.state().lat, this.state().lng)
  );

  constructor() {
    this.initSearchPipeline();
    this.initReverseGeocodePipeline();
  }

  initializeModal(
    container: HTMLElement,
    initialLat: number | null,
    initialLng: number | null,
    initialAddress: string
  ): void {
    const startLat = initialLat ?? DEFAULT_MAP_CENTER.lat;
    const startLng = initialLng ?? DEFAULT_MAP_CENTER.lng;

    this.state.update((s) => ({
      ...s,
      lat: startLat,
      lng: startLng,
      address: initialAddress || '',
      isMapLoading: true,
      isFullscreen: false,
      searchQuery: '',
      searchResults: [],
      selectedIndex: -1,
      isSearching: false,
      hasSearched: false,
    }));

    if (this.initTimeout) clearTimeout(this.initTimeout);
    this.initTimeout = setTimeout(() => {
      this.initOrResetMap(container, startLat, startLng, initialAddress);
    }, MAP_INIT_DELAY_MS);
  }

  private initSearchPipeline(): void {
    this.searchSubject$
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        distinctUntilChanged(),
        tap(() => this.state.update((s) => ({ ...s, isSearching: true }))),
        switchMap((query) => this.locationSearchService.searchPlaces(query)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((results) => {
        this.state.update((s) => ({
          ...s,
          isSearching: false,
          hasSearched: true,
          searchResults: results,
        }));
      });
  }

  private initReverseGeocodePipeline(): void {
    this.resolveAddressSubject$
      .pipe(
        tap(() => this.state.update((s) => ({ ...s, isReverseGeocoding: true }))),
        switchMap(({ lat, lng }) => this.reverseGeocodeService.resolve(lat, lng)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((address) => {
        this.state.update((s) => ({
          ...s,
          address,
          isReverseGeocoding: false,
        }));
      });
  }

  private initOrResetMap(
    container: HTMLElement,
    lat: number,
    lng: number,
    initialAddress: string
  ): void {
    if (!this.map) {
      this.map = this.leafletMapService.createMap(container, [lat, lng], DEFAULT_ZOOM);
      this.marker = this.leafletMapService.createMarker(this.map, [lat, lng], (pos) => {
        this.setLocation(pos.lat, pos.lng);
      });

      this.leafletMapService.bindMapClick(this.map, (pos) => {
        this.setLocation(pos.lat, pos.lng);
      });
    } else {
      this.leafletMapService.flyTo(this.map, [lat, lng], DEFAULT_ZOOM);
      this.leafletMapService.moveMarker(this.marker, [lat, lng]);
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    this.resizeObserver = this.leafletMapService.setupResizeObserver(container, () => {
      this.leafletMapService.invalidateSize(this.map);
    });

    setTimeout(() => {
      this.leafletMapService.invalidateSize(this.map);
      this.state.update((s) => ({ ...s, isMapLoading: false }));
    }, 200);

    if (!initialAddress) {
      this.resolveAddress(lat, lng);
    }
  }

  setLocation(lat: number, lng: number, knownAddress?: string): void {
    this.state.update((s) => ({
      ...s,
      lat,
      lng,
      address: knownAddress ?? s.address,
    }));

    this.leafletMapService.moveMarker(this.marker, [lat, lng]);
    this.leafletMapService.flyTo(this.map, [lat, lng]);

    if (!knownAddress) {
      this.resolveAddress(lat, lng);
    }
  }

  resolveAddress(lat: number, lng: number): void {
    this.resolveAddressSubject$.next({ lat, lng });
  }

  onSearchInput(query: string): void {
    this.state.update((s) => ({
      ...s,
      searchQuery: query,
      selectedIndex: -1,
    }));

    if (!query || query.trim().length < 2) {
      this.clearSearchState();
      return;
    }
    this.searchSubject$.next(query);
  }

  onSearchKeydown(event: KeyboardEvent): void {
    const s = this.state();
    const results = s.searchResults;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (results.length > 0) {
        this.state.update((st) => ({
          ...st,
          selectedIndex: Math.min(st.selectedIndex + 1, results.length - 1),
        }));
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (results.length > 0) {
        this.state.update((st) => ({
          ...st,
          selectedIndex: Math.max(st.selectedIndex - 1, -1),
        }));
      }
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const idx = s.selectedIndex;
      if (idx >= 0 && results[idx]) {
        this.selectSearchResult(results[idx]);
      } else if (s.searchQuery.trim()) {
        this.searchSubject$.next(s.searchQuery.trim());
      }
    }
  }

  selectSearchResult(result: SearchResult): void {
    this.clearSearchState();
    this.state.update((s) => ({ ...s, searchQuery: result.displayName }));
    this.setLocation(result.lat, result.lng, result.displayName);
  }

  clearSearchState(): void {
    this.state.update((s) => ({
      ...s,
      searchQuery: '',
      searchResults: [],
      selectedIndex: -1,
      isSearching: false,
      hasSearched: false,
    }));
  }

  useCurrentLocation(): void {
    if (this.state().isLocatingModal) return;

    this.state.update((s) => ({ ...s, isLocatingModal: true }));
    this.clearSearchState();

    let handled = false;
    const timeoutGuard = setTimeout(() => {
      if (!handled) {
        handled = true;
        this.state.update((s) => ({ ...s, isLocatingModal: false }));
      }
    }, LOCATION_SAFETY_GUARD_MS);

    this.currentLocationService
      .getCurrentPosition()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (pos) => {
          if (handled) return;
          handled = true;
          clearTimeout(timeoutGuard);
          this.state.update((s) => ({ ...s, isLocatingModal: false }));
          this.leafletMapService.invalidateSize(this.map);
          this.setLocation(pos.lat, pos.lng);
        },
        error: () => {
          if (handled) return;
          handled = true;
          clearTimeout(timeoutGuard);
          this.state.update((s) => ({ ...s, isLocatingModal: false }));
        },
      });
  }

  zoomIn(): void {
    this.leafletMapService.zoomIn(this.map);
  }

  zoomOut(): void {
    this.leafletMapService.zoomOut(this.map);
  }

  reCenter(): void {
    const lat = this.state().lat ?? DEFAULT_MAP_CENTER.lat;
    const lng = this.state().lng ?? DEFAULT_MAP_CENTER.lng;
    this.leafletMapService.flyTo(this.map, [lat, lng], RECENTER_ZOOM);
  }

  toggleFullscreen(): void {
    this.state.update((s) => ({ ...s, isFullscreen: !s.isFullscreen }));
    setTimeout(() => {
      this.leafletMapService.invalidateSize(this.map);
    }, 200);
  }

  getConfirmResult(): LocationResult | null {
    const s = this.state();
    if (s.lat === null || s.lng === null || s.isReverseGeocoding) {
      return null;
    }
    return {
      lat: s.lat,
      lng: s.lng,
      address: s.address,
    };
  }

  destroy(): void {
    if (this.initTimeout) {
      clearTimeout(this.initTimeout);
      this.initTimeout = null;
    }
    this.leafletMapService.destroy(this.map, this.marker, this.resizeObserver);
    this.map = null;
    this.marker = null;
    this.resizeObserver = undefined;
  }
}
