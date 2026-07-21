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

export function mapMatchedCaseResponseToDto(m: any): MatchedCaseDto {
  const fullName = [m.fName || m.FName, m.sName || m.SName, m.tName || m.TName, m.lName || m.LName]
    .filter(Boolean)
    .join(' ') || 'غير معروف';

  // 1. قراءة النسبة من similarity المربوطة بالباك إند
  let score = m.similarity ?? m.Similarity ?? m.matchScore ?? 0;

  // 2. إذا كانت النسبة كسر عشري (مثلاً 0.85)، تحويلها إلى نسبة مئوية (85)
  if (score > 0 && score <= 1) {
    score = Math.round(score * 100);
  } else {
    score = Math.round(score);
  }

  return {
    id: m.id ?? m.Id,
    caseCode: m.caseCode ?? m.CaseCode,
    caseType: m.caseType ?? m.CaseType,
    fullName,
    government: m.government ?? m.Government,
    age: m.age ?? m.Age,
    mainPhotoPath: m.mainPhoto ?? m.MainPhoto ?? m.mainPhotoPath,
    similarity: score, // 👈 أصبح يقرأ القيمة الصحيحة
    userId: m.userId ?? m.UserId ?? undefined,
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
