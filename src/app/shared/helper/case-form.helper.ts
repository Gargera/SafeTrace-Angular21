import { CaseMediaUploaderComponent } from "../components/cases-components/case-media-uploader/case-media-uploader";
import { FormGroup } from '@angular/forms';

export type CaseFormStep = 1 | 2 | 3;

export function nextCaseFormStep(step: CaseFormStep): CaseFormStep {
  const nextSteps: Record<CaseFormStep, CaseFormStep> = {
    1: 2,
    2: 3,
    3: 3
  };
  return nextSteps[step];
}

export function previousCaseFormStep(step: CaseFormStep): CaseFormStep {
  const prevSteps: Record<CaseFormStep, CaseFormStep> = {
    1: 1,
    2: 1,
    3: 2
  };
  return prevSteps[step];
}

export function localDateInputValue(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export class CaseObjectUrlRegistry {
  private readonly single = new Map<string, string>();
  private readonly lists = new Map<string, string[]>();

  /** Revokes the previous URL under `key` (if any) and creates a new one for `file`. */
  replace(key: string, file: File): string | null {
    this.revoke(key);

    try {
      const url = URL.createObjectURL(file);
      this.single.set(key, url);
      return url;
    } catch {
      return null;
    }
  }
  /** Revokes all previous URLs under `key` (if any) and creates fresh ones for `files`. */
  replaceMany(key: string, files: File[]): string[] | null {
    this.revoke(key);

    const urls: string[] = [];
    try {
      files.forEach(file => {
        urls.push(URL.createObjectURL(file));
      });
      this.lists.set(key, urls);
      return urls;
    } catch {
      urls.forEach(url => URL.revokeObjectURL(url));
      return null;
    }
  }

  /** Revokes and forgets whatever is currently stored under `key` (single or list). */
  revoke(key: string): void {
    const existing = this.single.get(key);
    if (existing) {
      URL.revokeObjectURL(existing);
      this.single.delete(key);
    }
    const existingList = this.lists.get(key);
    if (existingList) {
      existingList.forEach((u) => URL.revokeObjectURL(u));
      this.lists.delete(key);
    }
  }

  /** Revokes every URL this registry currently owns. Call from DestroyRef.onDestroy(). */
  revokeAll(): void {
    this.single.forEach((u) => URL.revokeObjectURL(u));
    this.single.clear();
    this.lists.forEach((list) => list.forEach((u) => URL.revokeObjectURL(u)));
    this.lists.clear();
  }
}

export function validateStepControls(form: FormGroup, controlNames: string[]): boolean {
  controlNames.forEach((name) => form.get(name)?.markAsTouched());
  return controlNames.some((name) => form.get(name)?.invalid);
}

// ─────────────────────────────────────────────────────────────
// Shared Media Interfaces
// ─────────────────────────────────────────────────────────────

export interface CaseMediaErrors {
  primary?: string | null;
  additional?: string | null;
  video?: string | null;
  policeReport?: string | null;
}

// ─────────────────────────────────────────────────────────────
// Backend validation-error mapping
// ─────────────────────────────────────────────────────────────

export interface CaseImageErrorHandlers {
  primary?: (message: string) => void;
  additional?: (message: string) => void;
  policeReport?: (message: string) => void;
  video?: (message: string) => void;
}

const IMAGE_FIELD_ROUTES: Array<{ match: RegExp; handler: keyof CaseImageErrorHandlers }> = [
  { match: /police.?report/i, handler: 'policeReport' },
  { match: /video/i, handler: 'video' },
  { match: /additional|photos|images/i, handler: 'additional' },
  { match: /primary/i, handler: 'primary' },
];


export interface CaseValidationResult {
  valid: boolean;
  message?: string;
}

export function validateCaseSubmission(
  form: FormGroup,
  mediaUploader: CaseMediaUploaderComponent | undefined
): CaseValidationResult {
  form.markAllAsTouched();
  if (form.invalid) {
    return { valid: false, message: 'يرجى مراجعة البيانات المدخلة وتصحيح الأخطاء.' };
  }

  if (mediaUploader) {
    const isMediaValid = mediaUploader.validate();
    if (!isMediaValid) {
      return { valid: false, message: 'يرجى مراجعة الصور والمستندات المرفقة وتصحيح الأخطاء.' };
    }
  }

  return { valid: true };
}

export function applyCaseValidationErrors(
  err: unknown,
  form: FormGroup,
  handlers: CaseImageErrorHandlers,
): boolean {
  if (!err || typeof err !== 'object') return false;

  const errObj = err as Record<string, unknown>;
  const body = errObj['error'];
  if (!body || typeof body !== 'object') return false;

  const bodyObj = body as Record<string, unknown>;
  const errors = bodyObj['errors'];
  if (!errors || typeof errors !== 'object' || Array.isArray(errors)) return false;

  let mappedAny = false;

  for (const [field, raw] of Object.entries(errors)) {
    const message = Array.isArray(raw) ? raw[0] : raw;
    if (typeof message !== 'string' || !message) continue;

    const route = IMAGE_FIELD_ROUTES.find((r) => r.match.test(field));
    if (route && handlers[route.handler]) {
      handlers[route.handler]!(message);
      mappedAny = true;
      continue;
    }

    const control = form.get(toCamelCase(field));
    if (control) {
      control.setErrors({ ...(control.errors ?? {}), server: message });
      control.markAsTouched();
      mappedAny = true;
    }
  }

  return mappedAny;
}

function toCamelCase(name: string): string {
  return name.length ? name[0].toLowerCase() + name.slice(1) : name;
}

export interface UpdateDraft<T = unknown> {
  formValue: T;
  currentStep: CaseFormStep;
  newPrimaryImage?: File | null;
  newAdditionalImages?: File[];
  deletedPhotoIds?: number[];
  newVideo?: File | null;
  removedVideo?: boolean;
  primaryPhotoId?: number | null;
  originalPrimaryImage?: File | null;
}
