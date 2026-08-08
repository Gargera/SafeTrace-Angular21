import { Injectable, inject, DestroyRef, ElementRef } from '@angular/core';
import { NavigationEnd, Router, Event as RouterEvent } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { CacheService } from '../cache/cache.service';
import { CACHE_TAGS, CACHE_TTL } from '../cache/cache.constants';

const SCROLL_CACHE_KEY = 'ScrollRestoration_Positions';

@Injectable({
  providedIn: 'root',
})
export class ScrollRestorationService {
  private readonly router = inject(Router);
  private readonly cacheService = inject(CacheService);

  private positions: Record<string, number> = {};

  constructor() {
    const cached = this.cacheService.get<Record<string, number>>(SCROLL_CACHE_KEY);
    if (cached) {
      this.positions = cached;
    }
  }

  registerContainer(
    elementRef: ElementRef<HTMLElement>,
    destroyRef: DestroyRef
  ): void {
    const el = elementRef.nativeElement;

    // Listen to scroll events on container
    const onScroll = () => {
      const currentUrl = this.router.url;
      this.positions[currentUrl] = el.scrollTop;
      this.cacheService.set(
        SCROLL_CACHE_KEY,
        this.positions,
        CACHE_TTL.UI_STATE,
        [CACHE_TAGS.UI_STATE]
      );
    };

    el.addEventListener('scroll', onScroll, { passive: true });

    destroyRef.onDestroy(() => {
      el.removeEventListener('scroll', onScroll);
    });

    // Restore scroll position on NavigationEnd
    this.router.events
      .pipe(
        filter((e: RouterEvent): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(destroyRef)
      )
      .subscribe((e: NavigationEnd) => {
        const savedPos = this.positions[e.urlAfterRedirects] ?? 0;
        // Request animation frame + microtask to ensure Angular view & DOM have rendered
        requestAnimationFrame(() => {
          setTimeout(() => {
            el.scrollTop = savedPos;
          }, 60);
        });
      });
  }

  getSavedPosition(url: string): number {
    return this.positions[url] ?? 0;
  }
}
