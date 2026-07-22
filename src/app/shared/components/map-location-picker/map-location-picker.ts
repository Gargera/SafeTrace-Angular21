import {
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
  ViewChild,
  ElementRef,
  OnChanges,
  SimpleChanges,
  OnDestroy,
  signal,
  computed,
  ChangeDetectionStrategy,
  HostListener,
  DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError, tap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GeocodingService } from '../../../core/services/geocoding.service';
import { ButtonComponent } from '../button/button';
import * as L from 'leaflet';

interface NominatimSearchResult {
  lat: number;
  lng: number;
  displayName: string;
}

@Component({
  selector: 'app-map-location-picker',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isOpen) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
        dir="rtl"
        (click)="onBackdropClick($event)"
      >
        <div
          [class]="containerClasses()"
          (click)="$event.stopPropagation()"
        >
          <!-- Header -->
          <div class="flex items-center justify-between border-b border-outline-variant/20 px-5 py-3.5 sm:px-6 sm:py-4">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                <span class="material-symbols-outlined text-2xl">location_on</span>
              </div>
              <div>
                <h3 class="text-base font-bold text-on-surface">تحديد الموقع على الخريطة</h3>
                <p class="text-xs text-on-surface-variant">انقر على الخريطة أو اسحب الدبوس لتحديد الموقع بدقة</p>
              </div>
            </div>

            <div class="flex items-center gap-1.5">
              <button
                type="button"
                (click)="toggleFullscreen()"
                [title]="isFullscreen() ? 'تصغير الشاشة' : 'ملء الشاشة'"
                class="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant/70 transition hover:bg-surface-container-high hover:text-on-surface"
              >
                <span class="material-symbols-outlined text-xl">
                  {{ isFullscreen() ? 'fullscreen_exit' : 'fullscreen' }}
                </span>
              </button>
              <button
                type="button"
                (click)="onCancel()"
                title="إغلاق (ESC)"
                class="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant/70 transition hover:bg-surface-container-high hover:text-on-surface"
              >
                <span class="material-symbols-outlined text-xl">close</span>
              </button>
            </div>
          </div>

          <!-- Search Input Section -->
          <div class="relative z-[1000] border-b border-outline-variant/15 bg-surface-bright px-5 py-3 sm:px-6">
            <div class="relative flex items-center">
              <input
                #searchInput
                type="text"
                [(ngModel)]="searchQuery"
                (input)="onSearchInput($event)"
                (keydown)="onSearchKeydown($event)"
                placeholder="ابحث عن منطقة، شارع، أو مدينة (عربي / English)..."
                class="w-full rounded-xl border border-outline-variant/50 bg-white py-2.5 pr-10 pl-10 text-xs text-on-surface shadow-2xs outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/20"
              />
              <span class="material-symbols-outlined absolute right-3 text-lg text-outline">search</span>

              @if (isSearching()) {
                <span class="material-symbols-outlined absolute left-3 animate-spin text-lg text-secondary">progress_activity</span>
              } @else if (searchQuery) {
                <button
                  type="button"
                  (click)="clearSearchState()"
                  class="absolute left-3 flex h-5 w-5 items-center justify-center rounded-full text-outline hover:text-on-surface"
                >
                  <span class="material-symbols-outlined text-sm">close</span>
                </button>
              }
            </div>

            <!-- Search Results Dropdown -->
            @if (searchResults().length > 0) {
              <div class="absolute right-5 left-5 sm:right-6 sm:left-6 z-[1050] mt-1 max-h-52 overflow-y-auto rounded-xl border border-outline-variant/40 bg-white shadow-2xl">
                @for (res of searchResults(); track res.displayName; let i = $index) {
                  <button
                    type="button"
                    (click)="selectSearchResult(res)"
                    [class.bg-secondary/10]="i === selectedIndex()"
                    class="flex w-full items-start gap-2.5 border-b border-outline-variant/10 p-3 text-right text-xs transition hover:bg-secondary/5"
                  >
                    <span class="material-symbols-outlined text-base text-secondary shrink-0 mt-0.5">place</span>
                    <span class="text-on-surface font-medium line-clamp-2 leading-relaxed">{{ res.displayName }}</span>
                  </button>
                }
              </div>
            }

            <!-- No Results Found Box -->
            @if (hasSearched() && searchResults().length === 0 && !isSearching()) {
              <div class="absolute right-5 left-5 sm:right-6 sm:left-6 z-[1050] mt-1 rounded-xl border border-outline-variant/30 bg-white p-3.5 text-center text-xs text-on-surface-variant shadow-xl animate-in fade-in">
                <p class="font-bold text-on-surface">لم نتمكن من العثور على هذا المكان</p>
                <p class="mt-0.5 text-[11px] text-outline">تأكد من كتابة الاسم بطريقة صحيحة أو حدده يدويًا على الخريطة</p>
              </div>
            }
          </div>

          <!-- Map Container View -->
          <div class="relative z-0 flex-1 w-full overflow-hidden bg-surface-container-low min-h-[320px] sm:min-h-[380px]">
            <!-- Map Ready Spinner Overlay -->
            @if (isMapLoading()) {
              <div class="absolute inset-0 z-[600] flex flex-col items-center justify-center bg-surface-bright/90 backdrop-blur-xs transition-opacity duration-300">
                <span class="material-symbols-outlined animate-spin text-4xl text-secondary">progress_activity</span>
                <p class="mt-3 text-xs font-bold text-on-surface">جاري تحميل الخريطة...</p>
              </div>
            }

            <!-- Geocoding Overlay Badge -->
            @if (isReverseGeocoding()) {
              <div class="absolute top-4 left-4 z-[500] flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-secondary shadow-md border border-secondary/20 backdrop-blur-xs animate-in fade-in duration-200">
                <span class="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                <span>جاري تحديد العنوان...</span>
              </div>
            }

            <!-- Actual Leaflet Container -->
            <div #mapContainer class="h-full w-full min-h-[320px] sm:min-h-[380px] z-0"></div>

            <!-- Floating Zoom Controls -->
            <div class="absolute top-4 right-4 z-[500] flex flex-col gap-2 pointer-events-auto">
              <button
                type="button"
                (click)="zoomIn()"
                title="تكبير"
                class="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-on-surface shadow-md border border-outline-variant/30 transition hover:bg-surface-bright active:scale-95"
              >
                <span class="material-symbols-outlined text-lg">add</span>
              </button>
              <button
                type="button"
                (click)="zoomOut()"
                title="تصغير"
                class="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-on-surface shadow-md border border-outline-variant/30 transition hover:bg-surface-bright active:scale-95"
              >
                <span class="material-symbols-outlined text-lg">remove</span>
              </button>
              <button
                type="button"
                (click)="reCenterMap()"
                title="إعادة التمركز على الدبوس"
                class="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-secondary shadow-md border border-outline-variant/30 transition hover:bg-surface-bright active:scale-95"
              >
                <span class="material-symbols-outlined text-lg">center_focus_strong</span>
              </button>
            </div>

            <!-- Floating Current Location FAB -->
            <button
              type="button"
              (click)="useCurrentLocationInModal()"
              [disabled]="isLocatingModal()"
              title="موقعي الحالي"
              class="absolute bottom-5 right-5 z-[500] flex h-12 w-12 items-center justify-center rounded-full bg-white text-secondary shadow-xl border border-outline-variant/30 transition-all hover:bg-surface-bright hover:scale-105 active:scale-95 disabled:opacity-60 disabled:pointer-events-none pointer-events-auto"
            >
              @if (isLocatingModal()) {
                <span class="material-symbols-outlined animate-spin text-xl">progress_activity</span>
              } @else {
                <span class="material-symbols-outlined text-2xl">my_location</span>
              }
            </button>
          </div>

          <!-- Location Info Bar -->
          <div class="border-t border-outline-variant/15 bg-surface-bright px-5 py-3 sm:px-6">
            <div class="flex items-center gap-2.5 text-xs text-on-surface-variant">
              <span class="material-symbols-outlined text-xl text-secondary shrink-0">place</span>
              <div class="flex-1 overflow-hidden">
                @if (isReverseGeocoding()) {
                  <span class="flex items-center gap-1.5 font-medium text-secondary">
                    <span class="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                    جاري جلب العنوان...
                  </span>
                } @else if (tempAddress()) {
                  <span class="font-semibold text-on-surface truncate block">{{ tempAddress() }}</span>
                } @else {
                  <span class="text-outline">اضغط على الخريطة لتحديد الموقع</span>
                }
              </div>
              @if (tempLat() !== null && tempLng() !== null) {
                <span class="rounded-md bg-surface-container px-2.5 py-1 text-[11px] font-mono text-on-surface-variant font-medium shrink-0">
                  {{ tempLat()?.toFixed(4) }}, {{ tempLng()?.toFixed(4) }}
                </span>
              }
            </div>
          </div>

          <!-- Footer Buttons -->
          <div class="flex items-center justify-end gap-3 border-t border-outline-variant/20 bg-white px-5 py-3.5 sm:px-6 sm:py-4">
            <app-button variant="secondary" type="button" (onClick)="onCancel()" extraClass="px-5">
              إلغاء
            </app-button>
            <app-button
              variant="primary"
              type="button"
              (onClick)="onConfirm()"
              [disabled]="isConfirmDisabled()"
              extraClass="px-6 gap-2"
            >
              <span class="material-symbols-outlined text-lg">check</span>
              تأكيد الموقع
            </app-button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      ::ng-deep .custom-leaflet-pin {
        background: transparent !important;
        border: none !important;
      }
      ::ng-deep .marker-pin-wrapper {
        animation: markerDrop 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }
      @keyframes markerDrop {
        0% {
          transform: translateY(-25px) scale(0.6);
          opacity: 0;
        }
        100% {
          transform: translateY(0) scale(1);
          opacity: 1;
        }
      }
      ::ng-deep .leaflet-container {
        font-family: inherit !important;
        z-index: 1 !important;
      }
      ::ng-deep .leaflet-control-container {
        position: relative;
        z-index: 450 !important;
      }
      ::ng-deep .leaflet-top,
      ::ng-deep .leaflet-bottom {
        z-index: 450 !important;
      }
    `,
  ],
})
export class MapLocationPickerComponent implements OnChanges, OnDestroy {
  private readonly geocodingService = inject(GeocodingService);
  private readonly destroyRef = inject(DestroyRef);

  @Input() isOpen = false;
  @Input() initialLat: number | null = null;
  @Input() initialLng: number | null = null;
  @Input() initialAddress: string = '';

  @Output() confirmLocation = new EventEmitter<{ lat: number; lng: number; address: string }>();
  @Output() cancel = new EventEmitter<void>();

  @ViewChild('mapContainer') private mapContainerRef?: ElementRef<HTMLDivElement>;
  @ViewChild('searchInput') private searchInputRef?: ElementRef<HTMLInputElement>;

  private map: L.Map | null = null;
  private marker: L.Marker | null = null;
  private resizeObserver?: ResizeObserver;
  private initTimeout: any = null;

  private readonly searchSubject$ = new Subject<string>();
  private readonly resolveAddressSubject$ = new Subject<{ lat: number; lng: number }>();

  readonly tempLat = signal<number | null>(null);
  readonly tempLng = signal<number | null>(null);
  readonly tempAddress = signal<string>('');

  readonly isMapLoading = signal<boolean>(true);
  readonly isReverseGeocoding = signal<boolean>(false);
  readonly isLocatingModal = signal<boolean>(false);
  readonly isFullscreen = signal<boolean>(false);

  searchQuery = '';
  readonly searchResults = signal<NominatimSearchResult[]>([]);
  readonly selectedIndex = signal<number>(-1);
  readonly isSearching = signal<boolean>(false);
  readonly hasSearched = signal<boolean>(false);

  readonly isConfirmDisabled = computed(() => {
    return this.tempLat() === null || this.tempLng() === null || this.isReverseGeocoding();
  });

  readonly containerClasses = computed(() =>
    this.isFullscreen()
      ? 'fixed inset-0 z-50 flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl transition-all duration-300'
      : 'relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl transition-all duration-300 animate-in zoom-in-95'
  );

  private readonly defaultLat = 30.0444;
  private readonly defaultLng = 31.2357;

  constructor() {
    this.initSearchPipeline();
    this.initReverseGeocodePipeline();
  }

  @HostListener('window:keydown.escape')
  handleEscapeKey(): void {
    if (this.isOpen) {
      this.onCancel();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']) {
      if (this.isOpen) {
        const startLat = this.initialLat ?? this.defaultLat;
        const startLng = this.initialLng ?? this.defaultLng;

        this.resetModalState(startLat, startLng);

        if (this.initTimeout) clearTimeout(this.initTimeout);
        this.initTimeout = setTimeout(() => {
          this.initOrResetMap(startLat, startLng);
          this.searchInputRef?.nativeElement?.focus();
        }, 120);
      } else {
        this.destroyMap();
      }
    }
  }

  private initSearchPipeline(): void {
    this.searchSubject$
      .pipe(
        debounceTime(350),
        distinctUntilChanged(),
        tap(() => this.isSearching.set(true)),
        switchMap((query: string) =>
          this.geocodingService.searchPlaces(query).pipe(
            catchError(() => of([] as NominatimSearchResult[]))
          )
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((results: NominatimSearchResult[]) => {
        this.isSearching.set(false);
        this.hasSearched.set(true);
        this.searchResults.set(results);
      });
  }

  private initReverseGeocodePipeline(): void {
    this.resolveAddressSubject$
      .pipe(
        tap(() => this.isReverseGeocoding.set(true)),
        switchMap(({ lat, lng }: { lat: number; lng: number }) =>
          this.geocodingService.reverseGeocode(lat, lng).pipe(
            catchError(() => of(`${lat.toFixed(4)}, ${lng.toFixed(4)}`))
          )
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((address: string) => {
        this.tempAddress.set(address);
        this.isReverseGeocoding.set(false);
      });
  }

  private resetModalState(startLat: number, startLng: number): void {
    this.tempLat.set(startLat);
    this.tempLng.set(startLng);
    this.tempAddress.set(this.initialAddress || '');
    this.clearSearchState();
    this.isMapLoading.set(true);
    this.isFullscreen.set(false);
  }

  private setLocation(lat: number, lng: number, knownAddress?: string): void {
    this.tempLat.set(lat);
    this.tempLng.set(lng);

    if (this.marker) {
      this.marker.setLatLng([lat, lng]);
    }

    this.flyToLocation(lat, lng);

    if (knownAddress) {
      this.tempAddress.set(knownAddress);
    } else {
      this.resolveAddress(lat, lng);
    }
  }

  private resolveAddress(lat: number, lng: number): void {
    this.resolveAddressSubject$.next({ lat, lng });
  }

  private searchLocation(query: string): void {
    const q = query ? query.trim() : '';
    if (!q || q.length < 2) {
      this.clearSearchState();
      return;
    }
    this.searchSubject$.next(q);
  }

  private flyToLocation(lat: number, lng: number, zoom?: number): void {
    if (!this.map) return;
    const targetZoom = zoom ?? Math.max(this.map.getZoom(), 15);
    this.map.flyTo([lat, lng], targetZoom, {
      duration: 1.2,
      easeLinearity: 0.25,
    });
  }

  clearSearchState(): void {
    this.searchQuery = '';
    this.searchResults.set([]);
    this.hasSearched.set(false);
    this.isSearching.set(false);
    this.selectedIndex.set(-1);
  }

  clearSearch(): void {
    this.clearSearchState();
  }

  useCurrentLocationInModal(): void {
    if (!navigator.geolocation || this.isLocatingModal()) return;

    this.isLocatingModal.set(true);
    this.clearSearchState();

    let handled = false;
    const timeoutGuard = setTimeout(() => {
      if (!handled) {
        handled = true;
        this.isLocatingModal.set(false);
      }
    }, 10000);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (handled) return;
        handled = true;
        clearTimeout(timeoutGuard);
        this.isLocatingModal.set(false);

        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        if (this.map) {
          this.map.invalidateSize();
        }
        this.setLocation(lat, lng);
      },
      () => {
        if (handled) return;
        handled = true;
        clearTimeout(timeoutGuard);
        this.isLocatingModal.set(false);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 30000 }
    );
  }

  private initOrResetMap(lat: number, lng: number): void {
    if (!this.mapContainerRef?.nativeElement) return;

    if (!this.map) {
      const mapInstance = this.initLeafletMap(this.mapContainerRef.nativeElement, [lat, lng]);
      const markerInstance = this.createCustomMarker([lat, lng]);
      markerInstance.addTo(mapInstance);

      markerInstance.on('dragend', () => {
        const pos = markerInstance.getLatLng();
        if (pos) {
          this.setLocation(pos.lat, pos.lng);
        }
      });

      mapInstance.on('click', (e: L.LeafletMouseEvent) => {
        this.setLocation(e.latlng.lat, e.latlng.lng);
      });

      this.map = mapInstance;
      this.marker = markerInstance;
    } else {
      this.flyToLocation(lat, lng, 13);
      if (this.marker) {
        this.marker.setLatLng([lat, lng]);
      }
    }

    this.setupResizeObserver();

    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize();
        this.isMapLoading.set(false);
      }
    }, 200);

    if (!this.initialAddress) {
      this.resolveAddress(lat, lng);
    }
  }

  private initLeafletMap(container: HTMLElement, center: [number, number]): L.Map {
    const map = L.map(container, {
      center,
      zoom: 13,
      zoomControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    return map;
  }

  private createCustomMarker(position: [number, number]): L.Marker {
    const customPin = L.divIcon({
      className: 'custom-leaflet-pin',
      html: `
        <div class="marker-pin-wrapper relative flex flex-col items-center justify-center -translate-x-1/2 -translate-y-full cursor-grab active:cursor-grabbing">
          <div class="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-white shadow-2xl ring-4 ring-white transition-transform duration-200 hover:scale-110">
            <span class="material-symbols-outlined text-2xl">location_on</span>
          </div>
          <div class="absolute -bottom-1.5 h-3 w-3 rotate-45 bg-secondary"></div>
          <div class="absolute -bottom-3 h-2 w-8 rounded-full bg-black/20 blur-[2px]"></div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 44],
    });

    return L.marker(position, {
      draggable: true,
      icon: customPin,
    });
  }

  private setupResizeObserver(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (!this.mapContainerRef?.nativeElement) return;

    this.resizeObserver = new ResizeObserver(() => {
      if (this.map) {
        this.map.invalidateSize();
      }
    });
    this.resizeObserver.observe(this.mapContainerRef.nativeElement);
  }

  onSearchInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.selectedIndex.set(-1);
    this.searchLocation(val);
  }

  onSearchKeydown(event: KeyboardEvent): void {
    const results = this.searchResults();
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (results.length > 0) {
        this.selectedIndex.update((i) => Math.min(i + 1, results.length - 1));
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (results.length > 0) {
        this.selectedIndex.update((i) => Math.max(i - 1, -1));
      }
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const idx = this.selectedIndex();
      if (idx >= 0 && results[idx]) {
        this.selectSearchResult(results[idx]);
      } else if (this.searchQuery.trim()) {
        this.searchLocation(this.searchQuery);
      }
    }
  }

  selectSearchResult(res: NominatimSearchResult): void {
    this.clearSearchState();
    this.searchQuery = res.displayName;
    this.setLocation(res.lat, res.lng, res.displayName);
  }

  zoomIn(): void {
    if (this.map) this.map.zoomIn();
  }

  zoomOut(): void {
    if (this.map) this.map.zoomOut();
  }

  reCenterMap(): void {
    const lat = this.tempLat() ?? this.defaultLat;
    const lng = this.tempLng() ?? this.defaultLng;
    this.flyToLocation(lat, lng, 14);
  }

  toggleFullscreen(): void {
    this.isFullscreen.update((f) => !f);
    setTimeout(() => {
      if (this.map) this.map.invalidateSize();
    }, 200);
  }

  onConfirm(): void {
    if (this.isConfirmDisabled()) return;
    const lat = this.tempLat();
    const lng = this.tempLng();
    const address = this.tempAddress();
    if (lat !== null && lng !== null) {
      this.confirmLocation.emit({ lat, lng, address });
    }
  }

  onCancel(): void {
    this.cancel.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    this.onCancel();
  }

  private destroyMap(): void {
    if (this.initTimeout) {
      clearTimeout(this.initTimeout);
      this.initTimeout = null;
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = undefined;
    }

    if (this.marker) {
      this.marker.off();
      this.marker.remove();
      this.marker = null;
    }
    if (this.map) {
      this.map.off();
      this.map.remove();
      this.map = null;
    }
  }

  ngOnDestroy(): void {
    this.destroyMap();
  }
}