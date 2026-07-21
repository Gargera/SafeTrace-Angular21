import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Toast } from './shared/components/toast/toast';
import { AuthService } from './core/services/auth.service';
import { LocationTrackingService } from './core/services/LocationTracking.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Toast],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('لقاء');

  constructor(
    private locationTrackingService: LocationTrackingService,
    private authService: AuthService,
  ) {}

  ngOnInit() {
    if (this.authService.isLoggedIn()) {
      this.locationTrackingService.startTrackingLocation();
    }
  }
}
