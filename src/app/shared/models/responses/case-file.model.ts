/**
 * Mirrors a CaseFiles row as returned inside case detail responses.
 * Adjust field names here if your actual XCaseDetailResponse DTO differs —
 * this is the one shape referenced by all 3 update pages.
 */
export interface CaseFileResponse {
  id: number;
  imagePath: string;
  isPrimary: boolean;
  faceId?: string | null;
}
