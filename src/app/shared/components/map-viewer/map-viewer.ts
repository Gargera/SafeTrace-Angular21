import {
  Component,
  AfterViewInit,
  ElementRef,
  ViewChild,
  Input,
} from '@angular/core';

import { GoogleMapsLoaderService } from '../../../core/services/google-maps-loader.service';

declare const google: any;

@Component({
  selector: 'app-map-viewer',
  standalone: true,
  templateUrl: './map-viewer.html',
  styleUrls: ['./map-viewer.css'],
})
export class MapViewerComponent implements AfterViewInit {

  @Input() lat!: number;
  @Input() lng!: number;

  @ViewChild('map')
  mapElement!: ElementRef<HTMLDivElement>;

  constructor(
    private mapsLoader: GoogleMapsLoaderService
  ) {}

  async ngAfterViewInit() {

    await this.mapsLoader.load();

    const map = new google.maps.Map(this.mapElement.nativeElement, {

      center: {
        lat: this.lat,
        lng: this.lng
      },

      zoom: 15,

      streetViewControl: false,

      fullscreenControl: false,

      mapTypeControl: false,

    });

    new google.maps.Marker({

      position: {
        lat: this.lat,
        lng: this.lng
      },

      map

    });

  }

}