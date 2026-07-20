import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, inject } from '@angular/core';
import { GeocodingService } from '../../../core/services/geocoding.service'; // تأكد من صحة مسار الخدمة لديك
import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewChild,
  AfterViewInit,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { GoogleMapsLoaderService } from '../../../core/services/google-maps-loader.service';
import { GeocodingService } from '../../../core/services/geocoding.service';

declare const google: any;

@Component({
  selector: 'app-map-location-picker',
  standalone: true,
  template: `<div id="map" style="height: 350px; width: 100%; border-radius: 12px; border: 1px solid #ccc;"></div>`,
  styles: [`
    #map {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }
  `]
})
export class MapLocationPickerComponent implements OnInit, OnDestroy {
  private geocodingService = inject(GeocodingService);

  private map: any = null;
  private marker: any = null;
  private mapReady = false;

  // إحداثيات لسه لازم تتطبق لما الخريطة تخلص تحميل (لو الـ Input اتبعت قبل initMap)
  private pendingExternalLocation: { lat: number; lng: number } | null = null;

  // عداد محاولات انتظار تحميل مكتبة جوجل، بدل setTimeout واحد بس
  private retryCount = 0;
  private readonly maxRetries = 10;

  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="map-picker">
      <input
        #searchInput
        type="text"
        class="map-search"
        placeholder="ابحث عن مكان (مثال: مدينة نصر، القاهرة)"
      />
      <div #mapEl class="map-canvas"></div>
      <div class="map-hint">
        @if (address()) {
          <span class="material-symbols-outlined" style="font-size:16px; vertical-align:middle;"
            >location_on</span
          >
          {{ address() }}
        } @else {
          اضغط على الخريطة أو ابحث عن مكان لتحديد الموقع
        }
      </div>
    </div>
  `,
  styles: [
    `
      .map-picker {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .map-search {
        width: 100%;
        padding: 11px 14px;
        border: 1.5px solid #dde1ee;
        border-radius: 10px;
        font-size: 14px;
        outline: none;
        box-sizing: border-box;
      }
      .map-search:focus {
        border-color: #0058be;
      }
      .map-canvas {
        width: 100%;
        height: 280px;
        border-radius: 12px;
        overflow: hidden;
        border: 1.5px solid #dde1ee;
      }
      .map-hint {
        font-size: 12.5px;
        color: #45474c;
      }
    `,
  ],
})
export class MapLocationPickerComponent implements AfterViewInit, OnDestroy {
  @Input() initialLat = 30.0444; // Cairo default
  @Input() initialLng = 31.2357;
  @Output() locationChange = new EventEmitter<{ lat: number; lng: number; address: string }>();

  /**
   * @Input خارجي يستقبله الأب (مثلاً زرار "استخدام موقعي الحالي" في urgent-create)
   * عشان يحرك الماركر والخريطة بدون ما يعمل reverse geocode تاني
   * (لأن الأب أصلاً عنده العنوان جاهز وهيبعته هو بنفسه عبر locationChange بتاعه).
   */
  @Input() set externalLocation(loc: { lat: number; lng: number } | null) {
    if (!loc) return;

    if (this.mapReady) {
      this.applyExternalLocation(loc);
    } else {
      // الخريطة لسه ما جهزتش (مكتبة جوجل لسه بتحمل)، نخزن الإحداثيات
      // ونطبقها أول ما initMap يخلص
      this.pendingExternalLocation = loc;
    }
  }

  // إحداثيات افتراضية لوسط القاهرة في حال لم يحدد المستخدم موقعه بعد
  private defaultLat = 30.0444;
  private defaultLng = 31.2357;

  ngOnInit(): void {
    this.waitForGoogleMaps();
  }

  private waitForGoogleMaps(): void {
    if (typeof google !== 'undefined' && google.maps) {
      this.initMap();
      return;
    }

    if (this.retryCount >= this.maxRetries) {
      // لو بعد كذا محاولة لسه مش متحملة، غالبًا فيه مشكلة تحميل السكريبت
      // (API key غلط، أو BillingNotEnabledMapError، أو مفيش اتصال إنترنت)
      console.error(
        'MapLocationPickerComponent: تعذر تحميل مكتبة Google Maps. تأكد من صحة الـ API key وأن الـ Billing مفعّل على المشروع.'
      );
      return;
    }

    this.retryCount++;
    setTimeout(() => this.waitForGoogleMaps(), 500);
  }

  private initMap(): void {
    const mapElement = document.getElementById('map');
    if (!mapElement) return;

    const start = this.pendingExternalLocation ?? { lat: this.defaultLat, lng: this.defaultLng };

    this.map = new google.maps.Map(mapElement, {
      zoom: 12,
      center: start,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });

    this.marker = new google.maps.Marker({
      position: start,
      map: this.map,
      draggable: true,
    });

    this.mapReady = true;

    if (this.pendingExternalLocation) {
      // كانت موجودة قبل ما الخريطة تجهز، مش محتاجين نعمل reverse geocode
      // تاني هنا لأن الأب أصلاً بيبعت العنوان بنفسه
      this.pendingExternalLocation = null;
    } else {
      // جلب العنوان للمرة الأولى للموقع الافتراضي
      this.updateAddress(this.defaultLat, this.defaultLng);
    }

    // تحديث الموقع عند سحب الدبوس
    this.marker.addListener('dragend', () => {
      const pos = this.marker.getPosition();
      if (pos) {
        this.updateAddress(pos.lat(), pos.lng());
      }
    });

    // نقل الدبوس للموقع الجديد عند الضغط على أي مكان بالخريطة
    this.map.addListener('click', (event: any) => {
      const latLng = event.latLng;
      if (latLng) {
        this.marker.setPosition(latLng);
        this.updateAddress(latLng.lat(), latLng.lng());
      }
    });
  }

  /**
   * تحريك الماركر والخريطة لموقع جاي من بره (زرار "موقعي الحالي")
   * من غير ما نعمل reverse geocode تاني، لأن العنوان أصلاً معروف.
   */
  private applyExternalLocation(loc: { lat: number; lng: number }): void {
    if (!this.map || !this.marker) return;
    const position = new google.maps.LatLng(loc.lat, loc.lng);
    this.marker.setPosition(position);
    this.map.panTo(position);
  }

  private updateAddress(lat: number, lng: number): void {
    this.geocodingService.reverseGeocode(lat, lng).subscribe({
      next: (address) => {
        this.locationChange.emit({ lat, lng, address });
      },
      error: () => {
        // Fallback في حال تعطل الشبكة
        this.locationChange.emit({ lat, lng, address: `${lat.toFixed(4)}, ${lng.toFixed(4)}` });
      }
    this.map.addListener('click', (e: any) => {
      this.marker.setPosition(e.latLng);
      this.setLocation(e.latLng.lat(), e.latLng.lng());
    });

    // this.geocoding.attachAutocomplete(this.searchInput.nativeElement, (result) => {
    //   this.map.setCenter({ lat: result.lat, lng: result.lng });
    //   this.map.setZoom(15);
    //   this.marker.setPosition({ lat: result.lat, lng: result.lng });
    //   this.address.set(result.address);
    //   this.locationChange.emit({ lat: result.lat, lng: result.lng, address: result.address });
    // });
  }

  private setLocation(lat: number, lng: number): void {
    this.geocoding.reverseGeocode(lat, lng).subscribe((addr) => {
      this.address.set(addr);
      this.locationChange.emit({ lat, lng, address: addr });
    });
  }

  ngOnDestroy(): void {
    // تنظيف المراجع لتجنب تسريب الذاكرة (Memory Leaks)
    if (this.marker) this.marker.setMap(null);
    this.map = null;
  }
}
