import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class GlobalLoadingService {
  private activeRequests = 0;
  isLoading = signal(false);

  startRequest() {
    this.activeRequests++;
    if (this.activeRequests > 0 && !this.isLoading()) {
      this.isLoading.set(true);
    }
  }

  endRequest() {
    this.activeRequests--;
    if (this.activeRequests <= 0) {
      this.activeRequests = 0;
      this.isLoading.set(false);
    }
  }
}
