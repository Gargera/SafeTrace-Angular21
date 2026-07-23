import { Injectable } from '@angular/core';
import * as L from 'leaflet';
import { createCustomMarker } from './leaflet-marker.factory';
import { DEFAULT_ZOOM } from './map-location-picker.constants';

@Injectable({
  providedIn: 'root',
})
export class LeafletMapService {
  createMap(container: HTMLElement, center: [number, number], zoom = DEFAULT_ZOOM): L.Map {
    const map = L.map(container, {
      center,
      zoom,
      zoomControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    return map;
  }

  createMarker(
    map: L.Map,
    position: [number, number],
    onDragEnd?: (pos: L.LatLng) => void,
  ): L.Marker {
    const marker = createCustomMarker(position);
    marker.addTo(map);

    if (onDragEnd) {
      marker.on('dragend', () => {
        const latLng = marker.getLatLng();
        onDragEnd(latLng);
      });
    }

    return marker;
  }

  bindMapClick(map: L.Map, onClick: (latLng: L.LatLng) => void): void {
    map.on('click', (e: L.LeafletMouseEvent) => {
      onClick(e.latlng);
    });
  }

  moveMarker(marker: L.Marker | null, position: [number, number]): void {
    if (marker) {
      marker.setLatLng(position);
    }
  }

  flyTo(map: L.Map | null, position: [number, number], zoom?: number): void {
    if (!map) return;
    const targetZoom = zoom ?? Math.max(map.getZoom(), 15);
    map.flyTo(position, targetZoom, {
      duration: 1.2,
      easeLinearity: 0.25,
    });
  }

  zoomIn(map: L.Map | null): void {
    if (map) {
      map.zoomIn();
    }
  }

  zoomOut(map: L.Map | null): void {
    if (map) {
      map.zoomOut();
    }
  }

  invalidateSize(map: L.Map | null): void {
    if (map) {
      map.invalidateSize();
    }
  }

  setupResizeObserver(container: HTMLElement, onResize: () => void): ResizeObserver {
    const observer = new ResizeObserver(() => {
      onResize();
    });
    observer.observe(container);
    return observer;
  }

  destroy(map: L.Map | null, marker: L.Marker | null, resizeObserver?: ResizeObserver): void {
    if (resizeObserver) {
      resizeObserver.disconnect();
    }
    if (marker) {
      marker.off();
      marker.remove();
    }
    if (map) {
      map.off();
      map.remove();
    }
  }
}
