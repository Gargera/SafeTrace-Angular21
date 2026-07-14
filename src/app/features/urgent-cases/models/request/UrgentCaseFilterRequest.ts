import { CasesFilterRequest } from '../../../../core/models/Cases.model';

export interface UrgentCasesFilterRequest extends CasesFilterRequest {
  latitude: number | null;
  longitude: number | null;
  radiusInMeters: number | null;
}
