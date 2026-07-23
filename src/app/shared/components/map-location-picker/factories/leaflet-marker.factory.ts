import * as L from 'leaflet';

export interface MarkerOptions {
  draggable?: boolean;
}

export function createCustomMarker(
  position: [number, number],
  options: MarkerOptions = { draggable: true }
): L.Marker {
  const isDraggable = options.draggable ?? true;
  const cursorClass = isDraggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer';

  const customPin = L.divIcon({
    className: 'custom-leaflet-pin',
    html: `
      <div class="marker-pin-wrapper relative flex flex-col items-center justify-center -translate-x-1/2 -translate-y-full ${cursorClass}">
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
    draggable: isDraggable,
    icon: customPin,
  });
}
