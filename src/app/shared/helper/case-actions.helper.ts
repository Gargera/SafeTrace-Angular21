import { CaseStatus } from '../enums/case-status';

export interface CaseCardActions {
  canView: boolean;
  canViewFoundDetails: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canMarkAsFound: boolean;
}

export function getCaseActions(
  status: CaseStatus,
  foundPersonInfoId?: number | null,
): CaseCardActions {
  switch (status) {
    case CaseStatus.Pending:
      return {
        canView: true,
        canViewFoundDetails: false,
        canUpdate: true,
        canDelete: true,
        canMarkAsFound: true,
      };
    case CaseStatus.Active:
      return {
        canView: true,
        canViewFoundDetails: false,
        canUpdate: true,
        canDelete: true,
        canMarkAsFound: true,
      };
    case CaseStatus.Rejected:
      return {
        canView: true,
        canViewFoundDetails: false,
        canUpdate: true,
        canDelete: true,
        canMarkAsFound: false,
      };
    case CaseStatus.Expired:
      return {
        canView: true,
        canViewFoundDetails: false,
        canUpdate: false,
        canDelete: true,
        canMarkAsFound: false,
      };
    case CaseStatus.Found:
      return {
        canView: false,
        canViewFoundDetails: true,
        canUpdate: false,
        canDelete: false,
        canMarkAsFound: false,
      };
    default:
      return {
        canView: true,
        canViewFoundDetails: false,
        canUpdate: false,
        canDelete: false,
        canMarkAsFound: false,
      };
  }
}
