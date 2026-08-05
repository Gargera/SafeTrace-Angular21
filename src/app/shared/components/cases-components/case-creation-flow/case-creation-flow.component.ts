import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmationModalComponent } from '../../confirmation-modal/confirmation-modal';
import { CaseCreationFlowService, CreateCaseDialogType } from '../../../../core/services/case-creation-flow.service';

@Component({
  selector: 'app-case-creation-flow',
  standalone: true,
  imports: [CommonModule, ConfirmationModalComponent],
  templateUrl: './case-creation-flow.component.html'
})
export class CaseCreationFlowComponent {
  public readonly flowService = inject(CaseCreationFlowService);
  public readonly DialogType = CreateCaseDialogType;

  get dialogState() {
    return this.flowService.dialogState;
  }

  getCooldownMessage(): string {
    const data = this.flowService.dialogData();
    const formattedTime = this.flowService.formatRemainingTime(data?.remainingMinutes);
    return `يمكنك إنشاء حالة عاجلة جديدة بعد:\n\n${formattedTime}`;
  }
}
