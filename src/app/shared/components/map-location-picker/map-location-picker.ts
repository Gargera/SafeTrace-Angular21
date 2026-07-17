import {
  Component, ElementRef, EventEmitter, Input, OnDestroy, Output,
  ViewChild, AfterViewInit, signal, ChangeDetectionStrategy,
} from '@angular/core';
import { GoogleMapsLoaderService } from '../../../core/services/google-maps-loader.service';
import { GeocodingService } from '../../../core/services/gecoding.service';

declare const google: any;

@Component({
  selector: 'app-map-location-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="map-picker">
      <input #searchInput type="text" class="map-search" placeholder="ابحث عن مكان (مثال: مدينة نصر، القاهرة)" />
      <div #mapEl class="map-canvas"></div>
      <div class="map-hint">
        @if (address()) {
          <span class="material-symbols-outlined" style="font-size:16px; vertical-align:middle;">location_on</span>
          {{ address() }}
        } @else {
          اضغط على الخريطة أو ابحث عن مكان لتحديد الموقع
        }
      </div>
    </div>
  `,
  styles: [`
    .map-picker { display: flex; flex-direction: column; gap: 8px; }
    .map-search {
      width: 100%; padding: 11px 14px; border: 1.5px solid #dde1ee; border-radius: 10px;
      font-size: 14px; outline: none; box-sizing: border-box;
    }
    .map-search:focus { border-color: #0058be; }
    .map-canvas { width: 100%; height: 280px; border-radius: 12px; overflow: hidden; border: 1.5px solid #dde1ee; }
    .map-hint { font-size: 12.5px; color: #45474c; }
  `],
})
export class MapLocationPickerComponent implements AfterViewInit, OnDestroy {
  @Input() initialLat = 30.0444; // Cairo default
  @Input() initialLng = 31.2357;
  @Output() locationChange = new EventEmitter<{ lat: number; lng: number; address: string }>();

  @ViewChild('mapEl') mapEl!: ElementRef<HTMLDivElement>;
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  address = signal<string>('');
  private map: any;
  private marker: any;

  constructor(
    private mapsLoader: GoogleMapsLoaderService,
    private geocoding: GeocodingService,
  ) {}

  async ngAfterViewInit(): Promise<void> {
    await this.mapsLoader.load();

    this.map = new google.maps.Map(this.mapEl.nativeElement, {
      center: { lat: this.initialLat, lng: this.initialLng },
      zoom: 12,
      streetViewControl: false,
      fullscreenControl: false,
      mapTypeControl: false,
    });

    this.marker = new google.maps.Marker({
      position: { lat: this.initialLat, lng: this.initialLng },
      map: this.map,
      draggable: true,
    });

    this.marker.addListener('dragend', () => {
      const pos = this.marker.getPosition();
      this.setLocation(pos.lat(), pos.lng());
    });

    this.map.addListener('click', (e: any) => {
      this.marker.setPosition(e.latLng);
      this.setLocation(e.latLng.lat(), e.latLng.lng());
    });

    this.geocoding.attachAutocomplete(this.searchInput.nativeElement, (result) => {
      this.map.setCenter({ lat: result.lat, lng: result.lng });
      this.map.setZoom(15);
      this.marker.setPosition({ lat: result.lat, lng: result.lng });
      this.address.set(result.address);
      this.locationChange.emit({ lat: result.lat, lng: result.lng, address: result.address });
    });
  }

  private setLocation(lat: number, lng: number): void {
    this.geocoding.reverseGeocode(lat, lng).subscribe((addr) => {
      this.address.set(addr);
      this.locationChange.emit({ lat, lng, address: addr });
    });
  }

  ngOnDestroy(): void {
    // google.maps listeners are cleaned up automatically with the DOM element
  }
}