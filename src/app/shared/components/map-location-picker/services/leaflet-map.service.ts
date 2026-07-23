import { Injectable } from '@angular/core';
import * as L from 'leaflet';
import { createCustomMarker } from '../factories/leaflet-marker.factory';
import { DEFAULT_ZOOM } from '../constants/location.constants';

const MINIMUM_FLY_ZOOM_LEVEL = 15;
const FLY_ANIMATION_DURATION_SECONDS = 1.2;
const FLY_EASE_LINEARITY_FACTOR = 0.25;

@Injectable({
  providedIn: 'root',
})
export class LeafletMapService {
  createMap(containerElement: HTMLElement, initialCenter: [number, number], zoomLevel = DEFAULT_ZOOM): L.Map {
    const leafletMap = L.map(containerElement, {
      center: initialCenter,
      zoom: zoomLevel,
      zoomControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(leafletMap);

    return leafletMap;
  }

  createMarker(
    leafletMap: L.Map,
    initialPosition: [number, number],
    onMarkerDragEnd?: (latLngPosition: L.LatLng) => void
  ): L.Marker {
    const customMarker = createCustomMarker(initialPosition, { draggable: true });
    customMarker.addTo(leafletMap);

    if (onMarkerDragEnd) {
      this.bindDrag(customMarker, onMarkerDragEnd);
    }

    return customMarker;
  }

  createReadOnlyMarker(leafletMap: L.Map, position: [number, number]): L.Marker {
    const readOnlyMarker = createCustomMarker(position, { draggable: false });
    readOnlyMarker.addTo(leafletMap);
    return readOnlyMarker;
  }

  bindDrag(markerInstance: L.Marker, onMarkerDragEnd: (latLngPosition: L.LatLng) => void): void {
    markerInstance.on('dragend', () => {
      onMarkerDragEnd(markerInstance.getLatLng());
    });
  }

  bindClick(leafletMap: L.Map, onMapClick: (latLngPosition: L.LatLng) => void): void {
    leafletMap.on('click', (event: L.LeafletMouseEvent) => {
      onMapClick(event.latlng);
    });
  }

  moveMarker(markerInstance: L.Marker | null, newPosition: [number, number]): void {
    if (!markerInstance) return;

    const currentLatLng = markerInstance.getLatLng();
    if (this.isSamePosition(currentLatLng, newPosition)) return;

    markerInstance.setLatLng(newPosition);
  }

  moveMap(leafletMap: L.Map | null, targetPosition: [number, number], customZoom?: number): void {
    if (!leafletMap) return;

    const targetZoom = customZoom ?? Math.max(leafletMap.getZoom(), MINIMUM_FLY_ZOOM_LEVEL);
    const currentCenter = leafletMap.getCenter();

    if (this.isSamePosition(currentCenter, targetPosition) && leafletMap.getZoom() === targetZoom) {
      return;
    }

    leafletMap.flyTo(targetPosition, targetZoom, {
      duration: FLY_ANIMATION_DURATION_SECONDS,
      easeLinearity: FLY_EASE_LINEARITY_FACTOR,
    });
  }

  setCenter(leafletMap: L.Map | null, targetPosition: [number, number], zoomLevel?: number): void {
    if (!leafletMap) return;
    leafletMap.setView(targetPosition, zoomLevel ?? leafletMap.getZoom());
  }

  zoomIn(leafletMap: L.Map | null): void {
    if (leafletMap) {
      leafletMap.zoomIn();
    }
  }

  zoomOut(leafletMap: L.Map | null): void {
    if (leafletMap) {
      leafletMap.zoomOut();
    }
  }

  invalidate(leafletMap: L.Map | null): void {
    if (leafletMap) {
      leafletMap.invalidateSize();
    }
  }

  setupResizeObserver(containerElement: HTMLElement, onResizeCallback: () => void): ResizeObserver {
    const resizeObserver = new ResizeObserver(() => {
      onResizeCallback();
    });
    resizeObserver.observe(containerElement);
    return resizeObserver;
  }

  destroyMap(
    leafletMap: L.Map | null,
    markerInstance?: L.Marker | null,
    resizeObserverInstance?: ResizeObserver
  ): void {
    if (resizeObserverInstance) {
      resizeObserverInstance.disconnect();
    }
    if (markerInstance) {
      markerInstance.off();
      markerInstance.remove();
    }
    if (leafletMap) {
      leafletMap.off();
      leafletMap.remove();
    }
  }

  destroy(
    leafletMap: L.Map | null,
    markerInstance: L.Marker | null,
    resizeObserverInstance?: ResizeObserver
  ): void {
    this.destroyMap(leafletMap, markerInstance, resizeObserverInstance);
  }

  private isSamePosition(currentLatLng: L.LatLng, targetPosition: [number, number]): boolean {
    const [targetLat, targetLng] = targetPosition;
    const precisionThreshold = 0.00001;
    return (
      Math.abs(currentLatLng.lat - targetLat) < precisionThreshold &&
      Math.abs(currentLatLng.lng - targetLng) < precisionThreshold
    );
  }
}
