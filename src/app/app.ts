import { Component, signal, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Toast } from './shared/components/toast/toast';
import { AuthService } from './core/services/auth.service';
import { LocationTrackingService } from './core/services/LocationTracking.service';
import { CaseCreationFlowComponent } from './shared/components/case-creation-flow/case-creation-flow.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Toast, CaseCreationFlowComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
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

}