import { signal, WritableSignal } from '@angular/core';
import { DuplicateDecision } from '../../enums/duplicate-decision';
import { MatchedCaseResponse } from '../../../core/models/cases.model';
import { CaseType } from '../../enums/case-type';
import { handleDuplicateDecision, DuplicateDecisionPayload } from './case-duplicate.helper';

export interface CaseDuplicateHandlerDeps<T> {
  saveDraft: () => void;
  onSubmit: (forceCreate: boolean) => void;
  pendingRequest: WritableSignal<T | null>;
}

export function useCaseDuplicateHandler<T>(deps: CaseDuplicateHandlerDeps<T>) {
  const showForceCreatePopup = signal(false);
  const showDuplicateInfoDialog = signal(false);
  const currentDuplicateDecision = signal<DuplicateDecision>(DuplicateDecision.None);
  const isBlockedDuplicate = signal(false);
  const matchedCases = signal<MatchedCaseResponse[]>([]);
  const existingCaseType = signal<CaseType | null>(null);

  const handleDuplicate = (data: DuplicateDecisionPayload): void => {
    handleDuplicateDecision(data, {
      setDecision: (d) => {
        currentDuplicateDecision.set(d);
        deps.saveDraft();
      },
      setBlocked: (b) => {
        isBlockedDuplicate.set(b);
        deps.saveDraft();
      },
      setMatchedCases: (c) => {
        matchedCases.set(c);
        deps.saveDraft();
      },
      setExistingCaseType: (t) => {
        existingCaseType.set(t);
        deps.saveDraft();
      },
      showInfoDialog: () => {
        showDuplicateInfoDialog.set(true);
        deps.saveDraft();
      },
      showForceCreatePopup: () => {
        showForceCreatePopup.set(true);
        deps.saveDraft();
      },
    });
  };

  const onForceCreateCancel = (): void => {
    showForceCreatePopup.set(false);
    deps.pendingRequest.set(null);
    deps.saveDraft();
  };

  const onForceCreateConfirm = (): void => {
    if (isBlockedDuplicate()) {
      return;
    }
    showForceCreatePopup.set(false);
    deps.saveDraft();
    deps.onSubmit(true);
  };

  const onPendingDialogClose = (): void => {
    showDuplicateInfoDialog.set(false);
    deps.pendingRequest.set(null);
    deps.saveDraft();
  };

  const onPendingDialogContinueCreate = (): void => {
    if (isBlockedDuplicate()) {
      return;
    }
    showDuplicateInfoDialog.set(false);
    deps.saveDraft();
    deps.onSubmit(true);
  };

  return {
    showForceCreatePopup,
    showDuplicateInfoDialog,
    currentDuplicateDecision,
    isBlockedDuplicate,
    matchedCases,
    existingCaseType,
    handleDuplicate,
    onForceCreateCancel,
    onForceCreateConfirm,
    onPendingDialogClose,
    onPendingDialogContinueCreate
  };
}
