import {
  Component,
  input,
  output,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardComponent } from '../../../../shared/components/card/card';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { ButtonComponent } from '../../../../shared/components/button/button';

export interface CaseFormStep {
  num: number;
  label: string;
}

export interface CaseStepHeader {
  icon: string;
  title: string;
  description: string;
}

@Component({
  selector: 'app-case-form-container',
  standalone: true,
  imports: [CommonModule, CardComponent, HeaderComponent, ButtonComponent],
  templateUrl: './case-form-container.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CaseFormContainerComponent {
  title = input.required<string>();
  subtitle = input<string>('');
  steps = input.required<CaseFormStep[]>();
  currentStep = input.required<number>();
  stepHeader = input<CaseStepHeader | null>(null);
  
  isSubmitting = input<boolean>(false);
  errorMsg = input<string | null>(null);
  endingMessage = input<string | null>(null);
  
  submitLabel = input<string>('إرسال البلاغ');
  submitIcon = input<string>('check_circle');

  // Outputs
  backAction = output<void>();
  prevStep = output<void>();
  nextStep = output<void>();
  submitForm = output<void>();
}
