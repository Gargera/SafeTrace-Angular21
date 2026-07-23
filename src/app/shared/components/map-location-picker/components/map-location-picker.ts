import {
  Component,
  ChangeDetectionStrategy,
  HostListener,
  ElementRef,
  inject,
  input,
  output,
  viewChild,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '../../button/button';
import { LocationResult } from '../models/location.models';
import { LocationFacade } from '../facade/location.facade';
import { LocationState } from '../state/location.state';

@Component({
  selector: 'app-map-location-picker',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent],
  providers: [LocationState, LocationFacade],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './map-location-picker.html',
  styleUrl: './map-location-picker.css',
})
export class MapLocationPickerComponent {
  readonly facade = inject(LocationFacade);
  readonly state = inject(LocationState);

  readonly isOpen = input<boolean>(false);
  readonly initialLat = input<number | null>(null);
  readonly initialLng = input<number | null>(null);
  readonly initialAddress = input<string>('');
  readonly readOnly = input<boolean>(false);

  readonly confirmLocation = output<LocationResult>();
  readonly cancel = output<void>();

  readonly mapContainerRef = viewChild.required<ElementRef<HTMLDivElement>>('mapContainer');
  readonly searchInputRef = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        this.initializeModal();
      } else {
        this.facade.destroy();
      }
    });
  }

  private initializeModal(): void {
    queueMicrotask(() => {
      const containerElement = this.mapContainerRef().nativeElement;

      this.facade.initializeModal(
        containerElement,
        this.initialLat(),
        this.initialLng(),
        this.initialAddress(),
        this.readOnly()
      );

      if (!this.readOnly()) {
        this.focusSearchInput();
      }
    });
  }

  private focusSearchInput(): void {
    this.searchInputRef()?.nativeElement?.focus();
  }

  @HostListener('window:keydown.escape')
  handleEscapeKey(): void {
    if (this.isOpen()) {
      this.onCancel();
    }
  }

  onSearchInput(inputEvent: Event): void {
    const inputValue = (inputEvent.target as HTMLInputElement).value;
    this.facade.onSearchInput(inputValue);
  }

  onConfirm(): void {
    const selectedLocationResult = this.facade.getConfirmResult();
    if (selectedLocationResult) {
      this.confirmLocation.emit(selectedLocationResult);
    }
  }

  onCancel(): void {
    this.cancel.emit();
  }

  openDirections(): void {
    const lat = this.state.latitude();
    const lng = this.state.longitude();
    if (lat !== null && lng !== null) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  onBackdropClick(mouseEvent: MouseEvent): void {
    this.onCancel();
  }
}
