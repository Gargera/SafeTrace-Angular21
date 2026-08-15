import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { shareReplay, tap, finalize } from 'rxjs/operators';
import { CacheEntry } from './cache-entry.model';

@Injectable({ providedIn: 'root' })
export class CacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private ongoingRequests = new Map<string, Observable<any>>();

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  set<T>(key: string, value: T, ttl: number, tags: string[] = []): void {
    this.cache.set(key, { value, expiry: Date.now() + ttl, tags });
  }

  remove(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  invalidateByTags(tagsToInvalidate: string[]): void {
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags && entry.tags.some(tag => tagsToInvalidate.includes(tag))) {
        this.cache.delete(key);
      }
    }
  }

  invalidate(pattern: RegExp): void {
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  getOrSet<T>(
    key: string,
    requestFactory: () => Observable<T>,
    ttl: number,
    tags: string[] = []
  ): Observable<T> {
    const cached = this.get<T>(key);
    if (cached) {
      return of(cached);
    }

    if (this.ongoingRequests.has(key)) {
      return this.ongoingRequests.get(key)!;
    }

    const obs$ = requestFactory().pipe(
      tap(response => {
        this.set(key, response, ttl, tags);
      }),
      finalize(() => {
        this.ongoingRequests.delete(key);
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this.ongoingRequests.set(key, obs$);

    return obs$;
  }
}