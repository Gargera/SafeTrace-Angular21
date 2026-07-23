import { Injectable, inject, DestroyRef } from '@angular/core';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, tap, catchError } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import * as L from 'leaflet';

import { SearchResult, LocationResult, MapCoordinates } from '../models/location.models';
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_ZOOM,
  RECENTER_ZOOM,
  SEARCH_DEBOUNCE_MS,
  MAP_INIT_DELAY_MS,
} from '../constants/location.constants';
import { formatCoordinates } from '../utils/location.utils';

import { LeafletMapService } from '../services/leaflet-map.service';
import { CurrentLocationService } from '../services/current-location.service';
import { GeocodingService } from '../../../../core/services/geocoding.service';
import { LocationState } from '../state/location.state';

const MAP_RENDER_DELAY_MS = 200;

@Injectable()
export class LocationFacade {
  readonly state = inject(LocationState);

  private readonly leafletMapService = inject(LeafletMapService);
  private readonly currentLocationService = inject(CurrentLocationService);
  private readonly geocodingService = inject(GeocodingService);
  private readonly destroyRef = inject(DestroyRef);

  private mapInstance: L.Map | null = null;
  private markerInstance: L.Marker | null = null;
  private mapResizeObserver?: ResizeObserver;
  private modalInitializationTimer: any = null;

  private readonly searchSubject$ = new Subject<string>();
  private readonly reverseGeocodeSubject$ = new Subject<MapCoordinates>();

  constructor() {
    this.initializeSearchPipeline();
    this.initializeReverseGeocodePipeline();
  }

  initializeModal(
    containerElement: HTMLElement,
    initialLatitude: number | null,
    initialLongitude: number | null,
    initialAddress: string
  ): void {
    const startLatitude = initialLatitude ?? DEFAULT_MAP_CENTER.lat;
    const startLongitude = initialLongitude ?? DEFAULT_MAP_CENTER.lng;

    this.state.resetState(startLatitude, startLongitude, initialAddress);
    this.scheduleMapInitialization(containerElement, startLatitude, startLongitude, initialAddress);
  }

  private scheduleMapInitialization(
    containerElement: HTMLElement,
    latitude: number,
    longitude: number,
    address: string
  ): void {
    if (this.modalInitializationTimer) {
      clearTimeout(this.modalInitializationTimer);
    }
    this.modalInitializationTimer = setTimeout(() => {
      this.initializeOrResetMap(containerElement, latitude, longitude, address);
    }, MAP_INIT_DELAY_MS);
  }

  private initializeSearchPipeline(): void {
    this.searchSubject$
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        distinctUntilChanged(),
        tap(() => this.state.setSearching(true)),
        switchMap((searchQuery) =>
          this.geocodingService.searchPlaces(searchQuery).pipe(
            catchError(() => of([] as SearchResult[]))
          )
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((searchResults) => {
        this.state.setSearchResults(searchResults);
        this.state.setSearching(false);
        this.state.setHasSearched(true);
      });
  }

  private initializeReverseGeocodePipeline(): void {
    this.reverseGeocodeSubject$
      .pipe(
        tap(() => this.state.setReverseGeocoding(true)),
        switchMap(({ lat, lng }) =>
          this.geocodingService.reverseGeocode(lat, lng).pipe(
            catchError(() => of(formatCoordinates(lat, lng)))
          )
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((resolvedAddress) => {
        this.state.setAddress(resolvedAddress);
        this.state.setReverseGeocoding(false);
      });
  }

  private initializeOrResetMap(
    containerElement: HTMLElement,
    latitude: number,
    longitude: number,
    initialAddress: string
  ): void {
    if (!this.mapInstance) {
      this.initializeMap(containerElement, latitude, longitude);
    } else {
      this.leafletMapService.moveMap(this.mapInstance, [latitude, longitude], DEFAULT_ZOOM);
      this.leafletMapService.moveMarker(this.markerInstance, [latitude, longitude]);
    }

    this.setupResizeObserver(containerElement);
    this.finalizeMapLoading();

    if (!initialAddress) {
      this.reverseGeocode(latitude, longitude);
    }
  }

  initializeMap(containerElement: HTMLElement, latitude: number, longitude: number): void {
    this.mapInstance = this.leafletMapService.createMap(containerElement, [latitude, longitude], DEFAULT_ZOOM);
    this.markerInstance = this.leafletMapService.createMarker(
      this.mapInstance,
      [latitude, longitude],
      (latLng) => this.updateLocation(latLng.lat, latLng.lng)
    );

    this.leafletMapService.bindClick(this.mapInstance, (latLng) => {
      this.updateLocation(latLng.lat, latLng.lng);
    });
  }

  private setupResizeObserver(containerElement: HTMLElement): void {
    if (this.mapResizeObserver) {
      this.mapResizeObserver.disconnect();
    }
    this.mapResizeObserver = this.leafletMapService.setupResizeObserver(containerElement, () => {
      this.leafletMapService.invalidate(this.mapInstance);
    });
  }

  private finalizeMapLoading(): void {
    setTimeout(() => {
      this.leafletMapService.invalidate(this.mapInstance);
      this.state.setMapLoading(false);
    }, MAP_RENDER_DELAY_MS);
  }

  updateLocation(latitude: number, longitude: number, knownAddress?: string): void {
    this.state.setCoordinates(latitude, longitude, knownAddress);
    this.leafletMapService.moveMarker(this.markerInstance, [latitude, longitude]);
    this.leafletMapService.moveMap(this.mapInstance, [latitude, longitude]);

    if (!knownAddress) {
      this.reverseGeocode(latitude, longitude);
    }
  }

  reverseGeocode(latitude: number, longitude: number): void {
    this.reverseGeocodeSubject$.next({ lat: latitude, lng: longitude });
  }

  onSearchInput(searchQuery: string): void {
    this.state.setSearchQuery(searchQuery);
    this.state.setSelectedIndex(-1);

    const trimmedQuery = searchQuery ? searchQuery.trim() : '';
    if (trimmedQuery.length < 2) {
      this.clearSearchState();
      return;
    }
    this.searchSubject$.next(trimmedQuery);
  }

  onSearchKeydown(keyboardEvent: KeyboardEvent): void {
    const searchResults = this.state.searchResults();

    if (keyboardEvent.key === 'ArrowDown') {
      this.navigateSearchResults(keyboardEvent, searchResults.length, 1);
    } else if (keyboardEvent.key === 'ArrowUp') {
      this.navigateSearchResults(keyboardEvent, searchResults.length, -1);
    } else if (keyboardEvent.key === 'Enter') {
      this.confirmSearchSelection(keyboardEvent, searchResults);
    }
  }

  private navigateSearchResults(event: KeyboardEvent, totalCount: number, direction: number): void {
    event.preventDefault();
    if (totalCount === 0) return;

    const nextIndex = this.state.selectedIndex() + direction;
    const boundedIndex = Math.max(-1, Math.min(nextIndex, totalCount - 1));
    this.state.setSelectedIndex(boundedIndex);
  }

  private confirmSearchSelection(event: KeyboardEvent, searchResults: SearchResult[]): void {
    event.preventDefault();
    const currentIndex = this.state.selectedIndex();

    if (currentIndex >= 0 && searchResults[currentIndex]) {
      this.selectSearchResult(searchResults[currentIndex]);
    } else if (this.state.searchQuery().trim()) {
      this.searchSubject$.next(this.state.searchQuery().trim());
    }
  }

  selectSearchResult(searchResult: SearchResult): void {
    this.clearSearchState();
    this.state.setSearchQuery(searchResult.displayName);
    this.updateLocation(searchResult.lat, searchResult.lng, searchResult.displayName);
  }

  clearSearchState(): void {
    this.state.clearSearchState();
  }

  useCurrentLocation(): void {
    if (this.state.isLocatingModal()) return;

    this.state.setLocatingModal(true);
    this.clearSearchState();

    this.currentLocationService
      .getCurrentLocation()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (coordinates) => {
          this.state.setLocatingModal(false);
          this.leafletMapService.invalidate(this.mapInstance);
          this.updateLocation(coordinates.lat, coordinates.lng);
        },
        error: () => {
          this.state.setLocatingModal(false);
        },
      });
  }

  zoomIn(): void {
    this.leafletMapService.zoomIn(this.mapInstance);
  }

  zoomOut(): void {
    this.leafletMapService.zoomOut(this.mapInstance);
  }

  reCenter(): void {
    const targetLatitude = this.state.latitude() ?? DEFAULT_MAP_CENTER.lat;
    const targetLongitude = this.state.longitude() ?? DEFAULT_MAP_CENTER.lng;
    this.leafletMapService.moveMap(this.mapInstance, [targetLatitude, targetLongitude], RECENTER_ZOOM);
  }

  toggleFullscreen(): void {
    this.state.toggleFullscreen();
    setTimeout(() => {
      this.leafletMapService.invalidate(this.mapInstance);
    }, MAP_RENDER_DELAY_MS);
  }

  getConfirmResult(): LocationResult | null {
    if (this.state.isConfirmDisabled()) {
      return null;
    }
    return {
      lat: this.state.latitude()!,
      lng: this.state.longitude()!,
      address: this.state.address(),
    };
  }

  destroy(): void {
    if (this.modalInitializationTimer) {
      clearTimeout(this.modalInitializationTimer);
      this.modalInitializationTimer = null;
    }
    this.leafletMapService.destroy(this.mapInstance, this.markerInstance, this.mapResizeObserver);
    this.mapInstance = null;
    this.markerInstance = null;
    this.mapResizeObserver = undefined;
  }
}
