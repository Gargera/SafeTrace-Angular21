import { CasesFilterRequest } from '../../../../core/models/cases.model';

export interface UrgentCasesFilterRequest extends CasesFilterRequest {
  latitude: number | null;
  longitude: number | null;
  radiusInKm: number | null;
}
