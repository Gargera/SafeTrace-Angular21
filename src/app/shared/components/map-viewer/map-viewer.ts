import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  ViewChild,
  inject,
} from '@angular/core';
import * as L from 'leaflet';
import { LeafletMapService } from '../map-location-picker/services/leaflet-map.service';

const VIEWER_DEFAULT_ZOOM = 15;

@Component({
  selector: 'app-map-viewer',
  standalone: true,
  templateUrl: './map-viewer.html',
  styleUrl: './map-viewer.css',
})
export class MapViewerComponent implements AfterViewInit, OnDestroy {
  @Input({ required: true }) lat!: number;
  @Input({ required: true }) lng!: number;

  @ViewChild('map', { static: true })
  private readonly mapElement!: ElementRef<HTMLDivElement>;

  private readonly leafletMapService = inject(LeafletMapService);

  private mapInstance: L.Map | null = null;
  private markerInstance: L.Marker | null = null;

  ngAfterViewInit(): void {
    this.initializeMapViewer();
  }

  ngOnDestroy(): void {
    this.leafletMapService.destroyMap(this.mapInstance, this.markerInstance);
    this.mapInstance = null;
    this.markerInstance = null;
  }

  private initializeMapViewer(): void {
    const position: [number, number] = [this.lat, this.lng];
    const container = this.mapElement.nativeElement;

    this.mapInstance = this.leafletMapService.createMap(container, position, VIEWER_DEFAULT_ZOOM);
    this.markerInstance = this.leafletMapService.createReadOnlyMarker(this.mapInstance, position);
  }
}