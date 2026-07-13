import { CasesFilterRequest } from "../../../../core/models/Cases.model";

export interface UrgentCasesFilterRequest extends CasesFilterRequest {
  latitude: number | null;
  longitude: number | null;
  radiusInMeters: number; // default: Number.MAX_VALUE on the backend
}