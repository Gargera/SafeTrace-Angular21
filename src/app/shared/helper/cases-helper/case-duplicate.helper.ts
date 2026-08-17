import { DuplicateDecision } from '../../enums/duplicate-decision';
import { MatchedCaseResponse } from '../../../core/models/cases.model';
import { CaseType } from '../../enums/case-type';

export interface DuplicateDecisionPayload {
  duplicateDecision: DuplicateDecision;
  isBlocked?: boolean;
  matchedCases?: MatchedCaseResponse[];
  existingCaseType?: CaseType | null;
}

export interface DuplicateDecisionHandlers {
  setDecision(decision: DuplicateDecision): void;
  setBlocked(blocked: boolean): void;
  setMatchedCases(cases: MatchedCaseResponse[]): void;
  setExistingCaseType(type: CaseType | null): void;
  showInfoDialog(): void;
  showForceCreatePopup(): void;
}

export function handleDuplicateDecision(
  data: DuplicateDecisionPayload,
  handlers: DuplicateDecisionHandlers
): void {

  if (!data?.duplicateDecision) {
    return;
  }

  handlers.setDecision(data.duplicateDecision);
  handlers.setBlocked(data.isBlocked ?? false);
  handlers.setMatchedCases(data.matchedCases ?? []);
  handlers.setExistingCaseType(data.existingCaseType ?? null);

  switch (data.duplicateDecision) {

    // Pending cases
    case DuplicateDecision.SameUserDuplicate:
    case DuplicateDecision.PendingOwnerCase:
    case DuplicateDecision.PendingUnknownCase:
      handlers.showInfoDialog();
      break;


    // Active cases
    case DuplicateDecision.ActiveOwnerCase:
    case DuplicateDecision.ActiveUnknownCase:
      handlers.showForceCreatePopup();
      break;

    case DuplicateDecision.None:
      break;
  }
}