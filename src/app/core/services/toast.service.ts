import { Injectable, signal } from '@angular/core';

export type SnackbarType = 'success' | 'error' | 'info';

export interface SnackbarMessage {
  id: number;
  text: string;
  type: SnackbarType;
}

/**
 * App-wide snackbar/toast service. Purely signal-driven — no Angular
 * Material dependency, so it slots into projects using the custom M3
 * Tailwind token system instead of `@angular/material`.
 *
 * Mount a single `<app-toast />` (see ./toast) near the root of the
 * component tree that should display messages. Any component can then
 * inject this service and call `.success()`, `.error()`, or `.show()`.
 */
@Injectable({ providedIn: 'root' })
export class SnackbarService {
  readonly message = signal<SnackbarMessage | null>(null);

  #timeoutId: ReturnType<typeof setTimeout> | null = null;
  #counter = 0;

  show(text: string, type: SnackbarType = 'info', durationMs = 3500): void {
    if (this.#timeoutId) {
      clearTimeout(this.#timeoutId);
      this.#timeoutId = null;
    }

    const id = ++this.#counter;
    this.message.set({ id, text, type });

    this.#timeoutId = setTimeout(() => {
      // Only auto-dismiss if a newer message hasn't already replaced this one.
      if (this.message()?.id === id) {
        this.message.set(null);
      }
      this.#timeoutId = null;
    }, durationMs);
  }

  success(text: string, durationMs = 3500): void {
    this.show(text, 'success', durationMs);
  }

  error(text: string, durationMs = 1000000000): void {
    this.show(text, 'error', durationMs);
  }

  info(text: string, durationMs = 3500): void {
    this.show(text, 'info', durationMs);
  }

  dismiss(): void {
    if (this.#timeoutId) {
      clearTimeout(this.#timeoutId);
      this.#timeoutId = null;
    }
    this.message.set(null);
  }
}
