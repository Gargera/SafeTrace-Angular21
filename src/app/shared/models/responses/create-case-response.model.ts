import { MatchedCaseResponse } from './matched-case.model';

/**
 * Response of POST CreateCase for all 3 case types.
 * - isCreated = true  -> case created, `id` is the new case id.
 * - isCreated = false -> cross-type duplicate matches found, nothing was created.
 *                        `matchedCases` holds the candidates; call CreateCase again
 *                        with forceCreate=true to create anyway.
 */
export interface CreateCaseResponse {
  id: number;
  isCreated: boolean;
  matchedCases?: MatchedCaseResponse[] | null;
}
