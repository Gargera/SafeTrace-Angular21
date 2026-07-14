import { NgClass } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { BadgeComponent } from '../../../ui/badge/badge.component';
import { ButtonComponent } from '../../../ui/button/button.component';
import { IconButtonComponent } from '../../../ui/button/icon-button.component';
import { ChevronIconComponent } from '../../../ui/icon/chevron-icon.component';

@Component({
  selector: 'app-case-header',
  standalone: true,
  imports: [NgClass, BadgeComponent, ButtonComponent, IconButtonComponent, ChevronIconComponent],
  templateUrl: './case-header.component.html',
  styleUrls: ['./case-header.component.css'],
})
export class CaseHeaderComponent {
  // Header
  @Input() title = '';
  @Input() subtitle = '';
  @Input() description = '';

  // Loading
  @Input() loading = false;

  // Back Button
  @Input() showBackButton = false;
  @Input() backButtonLabel = 'Back';

  // Badge
  @Input() badge = '';
  @Input() badgeClass = 'bg-tertiary-fixed text-on-tertiary-fixed';

  // Primary Button
  @Input() showPrimary = true;
  @Input() primaryActionLabel = '';
  @Input() primaryDisabled = false;

  @Input() primaryButtonClass = 'bg-primary hover:opacity-90 text-on-primary shadow-sm';

  // Secondary Button
  @Input() showSecondary = true;
  @Input() secondaryActionLabel = '';
  @Input() secondaryDisabled = false;

  @Input() secondaryButtonClass =
    'border border-outline-variant text-on-surface-variant hover:bg-surface-container-highest';

  // Layout
  @Input() readonly = false;

  // Events
  @Output() primaryAction = new EventEmitter<void>();

  @Output() secondaryAction = new EventEmitter<void>();

  @Output() backAction = new EventEmitter<void>();
}
