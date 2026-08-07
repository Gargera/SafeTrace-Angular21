import { Injectable, signal, computed } from '@angular/core';
import { SearchResult } from '../models/location.models';
import { DEFAULT_MAP_CENTER } from '../constants/location.constants';
import { formatCoordinates } from '../utils/location.utils';

@Injectable()
export class LocationState {
  readonly latitude = signal<number | null>(null);
  readonly longitude = signal<number | null>(null);
  readonly address = signal<string>('');

  readonly searchQuery = signal<string>('');
  readonly searchResults = signal<SearchResult[]>([]);
  readonly selectedIndex = signal<number>(-1);

  readonly isSearching = signal<boolean>(false);
  readonly hasSearched = signal<boolean>(false);
  readonly isMapLoading = signal<boolean>(true);
  readonly isReverseGeocoding = signal<boolean>(false);
  readonly isLocatingModal = signal<boolean>(false);
  readonly isFullscreen = signal<boolean>(false);

  readonly isConfirmDisabled = computed(() => {
    return this.latitude() === null || this.longitude() === null || this.isReverseGeocoding();
  });

  readonly formattedCoordinates = computed(() =>
    formatCoordinates(this.latitude(), this.longitude())
  );

  readonly containerClasses = computed(() =>
    this.isFullscreen()
      ? 'fixed inset-0 z-50 flex h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl transition-all duration-300'
      : 'relative flex max-h-[95dvh] sm:max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl transition-all duration-300 animate-in zoom-in-95'
  );

  resetState(initialLatitude: number | null, initialLongitude: number | null, initialAddress: string): void {
    this.latitude.set(initialLatitude ?? DEFAULT_MAP_CENTER.lat);
    this.longitude.set(initialLongitude ?? DEFAULT_MAP_CENTER.lng);
    this.address.set(initialAddress || '');
    this.isMapLoading.set(true);
    this.isFullscreen.set(false);
    this.clearSearchState();
  }

  setCoordinates(latitude: number, longitude: number, knownAddress?: string): void {
    this.latitude.set(latitude);
    this.longitude.set(longitude);
    if (knownAddress !== undefined) {
      this.address.set(knownAddress);
    }
  }

  setAddress(resolvedAddress: string): void {
    this.address.set(resolvedAddress);
  }

  setSearchQuery(query: string): void {
    this.searchQuery.set(query);
  }

  setSearchResults(results: SearchResult[]): void {
    this.searchResults.set(results);
  }

  setSelectedIndex(index: number): void {
    this.selectedIndex.set(index);
  }

  setSearching(isSearching: boolean): void {
    this.isSearching.set(isSearching);
  }

  setHasSearched(hasSearched: boolean): void {
    this.hasSearched.set(hasSearched);
  }

  setMapLoading(isLoading: boolean): void {
    this.isMapLoading.set(isLoading);
  }

  setReverseGeocoding(isGeocoding: boolean): void {
    this.isReverseGeocoding.set(isGeocoding);
  }

  setLocatingModal(isLocating: boolean): void {
    this.isLocatingModal.set(isLocating);
  }

  setFullscreen(isFullscreen: boolean): void {
    this.isFullscreen.set(isFullscreen);
  }

  toggleFullscreen(): void {
    this.isFullscreen.update((current) => !current);
  }

  clearSearchState(): void {
    this.searchQuery.set('');
    this.searchResults.set([]);
    this.selectedIndex.set(-1);
    this.isSearching.set(false);
    this.hasSearched.set(false);
  }
}
