import { NgClass } from '@angular/common';
import { Component, input, output } from '@angular/core';

import { ButtonComponent } from '../../button/button';
import { CaseType } from '../../../enums/case-type';
import { getCaseTypeTranslationAr } from '../../../../core/constants/dictionaries/case.type.dictionary';

@Component({
  selector: 'app-case-header',
  standalone: true,
  imports: [NgClass, ButtonComponent],
  templateUrl: './case-header.component.html',
  styleUrls: ['./case-header.component.css'],
})
export class CaseHeaderComponent {
  // Header
  title = input('');
  subtitle = input('');
  description = input('');

  // Loading
  loading = input(false);

  // Filter
  showCaseTypeFilter = input(false);
  caseTypeChange = output<string>();

  caseTypes = Object.values(CaseType);

  getCaseTypeName(type: string): string {
    return getCaseTypeTranslationAr(type);
  }

  // Back Button
  showBackButton = input(false);
  backButtonLabel = input('Back');

  // Badge
  badge = input('');
  badgeClass = input('bg-tertiary-fixed text-on-tertiary-fixed');

  // Primary Button
  showPrimary = input(true);
  primaryActionLabel = input('');
  primaryActionIcon = input('');
  primaryDisabled = input(false);

  primaryButtonClass = input('bg-primary hover:opacity-90 text-on-primary shadow-sm');

  // Secondary Button
  showSecondary = input(true);
  secondaryActionLabel = input('');
  secondaryActionIcon = input('');
  secondaryDisabled = input(false);

  secondaryButtonClass = input(
    'border border-outline-variant text-on-surface-variant hover:bg-surface-container-highest',
  );

  // Layout
  readonly = input(false);

  // Events
  primaryAction = output<void>();
  secondaryAction = output<void>();
  backAction = output<void>();
}
