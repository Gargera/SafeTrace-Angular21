import { describe, expect, it, vi, beforeEach } from 'vitest';
import { handleDuplicateDecision, DuplicateDecisionHandlers } from './case-duplicate.helper';
import { DuplicateDecision } from '../enums/duplicate-decision';
import { CaseType } from '../enums/case-type';

describe('case-duplicate.helper.ts', () => {
  let mockHandlers: DuplicateDecisionHandlers;

  beforeEach(() => {
    mockHandlers = {
      setDecision: vi.fn(),
      setBlocked: vi.fn(),
      setMatchedCases: vi.fn(),
      setExistingCaseType: vi.fn(),
      showInfoDialog: vi.fn(),
      showForceCreatePopup: vi.fn(),
    };
  });

  it('should not do anything if no decision is provided', () => {
    handleDuplicateDecision({} as unknown as import('./case-duplicate.helper').DuplicateDecisionPayload, mockHandlers);
    expect(mockHandlers.setDecision).not.toHaveBeenCalled();
    expect(mockHandlers.showInfoDialog).not.toHaveBeenCalled();
    expect(mockHandlers.showForceCreatePopup).not.toHaveBeenCalled();
  });

  it('should apply default values when only duplicateDecision exists', () => {
    const data = {
      duplicateDecision: DuplicateDecision.SameUserDuplicate
    };
    handleDuplicateDecision(data, mockHandlers);

    expect(mockHandlers.setDecision).toHaveBeenCalledWith(DuplicateDecision.SameUserDuplicate);
    expect(mockHandlers.setBlocked).toHaveBeenCalledWith(false);
    expect(mockHandlers.setMatchedCases).toHaveBeenCalledWith([]);
    expect(mockHandlers.setExistingCaseType).toHaveBeenCalledWith(null);
  });

  it('should update state correctly and not call any dialogs when decision is None', () => {
    const data = {
      duplicateDecision: DuplicateDecision.None
    };
    handleDuplicateDecision(data, mockHandlers);

    expect(mockHandlers.setDecision).toHaveBeenCalledWith(DuplicateDecision.None);
    expect(mockHandlers.setBlocked).toHaveBeenCalledWith(false);
    expect(mockHandlers.setMatchedCases).toHaveBeenCalledWith([]);
    expect(mockHandlers.setExistingCaseType).toHaveBeenCalledWith(null);
    expect(mockHandlers.showInfoDialog).not.toHaveBeenCalled();
    expect(mockHandlers.showForceCreatePopup).not.toHaveBeenCalled();
  });

  it('should map decision and default properties when not blocked', () => {
    const data = {
      duplicateDecision: DuplicateDecision.None,
      isBlocked: false
    };
    handleDuplicateDecision(data, mockHandlers);

    expect(mockHandlers.setDecision).toHaveBeenCalledWith(DuplicateDecision.None);
    expect(mockHandlers.setBlocked).toHaveBeenCalledWith(false);
    expect(mockHandlers.setMatchedCases).toHaveBeenCalledWith([]);
    expect(mockHandlers.setExistingCaseType).toHaveBeenCalledWith(null);
    expect(mockHandlers.showInfoDialog).not.toHaveBeenCalled();
    expect(mockHandlers.showForceCreatePopup).not.toHaveBeenCalled();
  });

  it('should map decision and properties when blocked', () => {
    const data = {
      duplicateDecision: DuplicateDecision.None,
      isBlocked: true,
      matchedCases: [{ id: 1 } as import('../../core/models/cases.model').MatchedCaseResponse],
      existingCaseType: CaseType.Unknown
    };
    handleDuplicateDecision(data, mockHandlers);

    expect(mockHandlers.setDecision).toHaveBeenCalledWith(DuplicateDecision.None);
    expect(mockHandlers.setBlocked).toHaveBeenCalledWith(true);
    expect(mockHandlers.setMatchedCases).toHaveBeenCalledWith([{ id: 1 }]);
    expect(mockHandlers.setExistingCaseType).toHaveBeenCalledWith(CaseType.Unknown);
  });

  describe('Duplicate Dialog Triggers', () => {
    const infoDialogCases = [
      DuplicateDecision.SameUserDuplicate,
      DuplicateDecision.PendingOwnerCase,
      DuplicateDecision.PendingUnknownCase
    ];

    infoDialogCases.forEach(decision => {
      it(`should trigger info dialog for ${DuplicateDecision[decision] ?? decision}`, () => {
        handleDuplicateDecision({ duplicateDecision: decision, isBlocked: false }, mockHandlers);
        expect(mockHandlers.showInfoDialog).toHaveBeenCalledTimes(1);
        expect(mockHandlers.showForceCreatePopup).not.toHaveBeenCalled();
      });
    });

    const forceCreateCases = [
      DuplicateDecision.ActiveOwnerCase,
      DuplicateDecision.ActiveUnknownCase
    ];

    forceCreateCases.forEach(decision => {
      it(`should trigger force create popup for ${DuplicateDecision[decision] ?? decision}`, () => {
        handleDuplicateDecision({ duplicateDecision: decision, isBlocked: false }, mockHandlers);
        expect(mockHandlers.showForceCreatePopup).toHaveBeenCalledTimes(1);
        expect(mockHandlers.showInfoDialog).not.toHaveBeenCalled();
      });
    });
  });
});
