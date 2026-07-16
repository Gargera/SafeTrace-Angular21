import { CaseType } from '../../enums/case-type';
import { MatchedCaseResponse } from '../../../core/models/Cases.model';

export interface MatchedCaseDto {
  id: number;
  caseCode: string;
  caseType: CaseType;
  fullName: string;
  government: string;
  age: number;
  mainPhotoPath: string | null;
  similarity: number;
  /** ⚠️ لسه مش موجود في MatchedCaseResponse من الباك - لازم يتضاف عشان زرار "تواصل" يشتغل */
  userId?: string;
}

export function mapMatchedCaseResponseToDto(m: MatchedCaseResponse): MatchedCaseDto {
  const fullName = [m.fName, m.sName, m.tName, m.lName].filter(Boolean).join(' ') || 'غير معروف';

  return {
    id: m.id,
    caseCode: m.caseCode,
    caseType: m.caseType,
    fullName,
    government: m.government,
    age: m.age,
    mainPhotoPath: m.mainPhoto,
    similarity: m.matchScore,
    userId: undefined, // TODO: اربطها لما الباك يضيف userId في MatchedCaseResponse
  };
}

export function mapCaseTypeToCardType(caseType: CaseType): 'long-term' | 'unknown' | 'urgent' {
  switch (caseType) {
    case CaseType.LongTerm: return 'long-term';
    case CaseType.Unknown: return 'unknown';
    case CaseType.Urgent: return 'urgent';
    default: return 'long-term';
  }
}

export type { MatchedCaseResponse };
