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
import { ButtonComponent } from '../button/button';
import { LocationResult } from './map-location-picker.types';
import { MapLocationFacade } from './map-location.facade';

@Component({
  selector: 'app-map-location-picker',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent],
  providers: [MapLocationFacade],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './map-location-picker.html',
  styleUrl: './map-location-picker.css',
})
export class MapLocationPickerComponent {
  readonly facade = inject(MapLocationFacade);

  readonly isOpen = input<boolean>(false);
  readonly initialLat = input<number | null>(null);
  readonly initialLng = input<number | null>(null);
  readonly initialAddress = input<string>('');

  readonly confirmLocation = output<LocationResult>();
  readonly cancel = output<void>();

  readonly mapContainerRef = viewChild.required<ElementRef<HTMLDivElement>>('mapContainer');
  readonly searchInputRef = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        queueMicrotask(() => {
          const container = this.mapContainerRef().nativeElement;

          this.facade.initializeModal(
            container,
            this.initialLat(),
            this.initialLng(),
            this.initialAddress(),
          );

          this.searchInputRef()?.nativeElement?.focus();
        });
      } else {
        this.facade.destroy();
      }
    });
  }

  @HostListener('window:keydown.escape')
  handleEscapeKey(): void {
    if (this.isOpen()) {
      this.onCancel();
    }
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.facade.onSearchInput(value);
  }

  onConfirm(): void {
    const result = this.facade.getConfirmResult();
    if (result) {
      this.confirmLocation.emit(result);
    }
  }

  onCancel(): void {
    this.cancel.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    this.onCancel();
  }
}
