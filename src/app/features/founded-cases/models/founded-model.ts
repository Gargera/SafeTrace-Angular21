export interface FoundedPerson {
  caseId: number;
  name: string;
  age: string;
  foundedAt: string;
  image: string | null;
}

export interface FoundedApiResponse {
  success: boolean;
  message: string;
  statusCode: number;
  data: FoundedPerson[];
}

export type Gender = 'Male' | 'Female' | '';

export const AGE_CATEGORIES: { label: string; value: number }[] = [
  { label: 'الفئة العمرية', value: 0 },
  { label: 'طفل (0-12)', value: 1 },
  { label: 'مراهق (13-19)', value: 2 },
  { label: 'بالغ (20-60)', value: 3 },
  { label: 'مسن (+60)', value: 4 },
];

export interface FoundedFilter {
  search?: string;
  ageCategory: number;
  gender?: Gender;
  page: number;
  pageSize: number;
}
