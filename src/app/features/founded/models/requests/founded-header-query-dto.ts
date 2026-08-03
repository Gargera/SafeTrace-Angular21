import { CaseType } from '../../../../shared/enums/case-type';
import { Gender } from '../../../../shared/enums/gender';

export interface FoundedHeaderQueryDTO {
  search?: string;
  minAge?: number;
  maxAge?: number;
  caseType?: CaseType | null;
  gender?: Gender | null;
  page: number;
  pageSize: number;
}
