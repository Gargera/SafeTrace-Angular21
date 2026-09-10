import { Component, inject } from '@angular/core';
import { SnackbarService } from '../../../shared/services/toast.service';

/**
 * Renders whatever message currently lives in SnackbarService, if any.
 * Mount once — e.g. at the bottom of edit-profile.html, or higher up the
 * tree (app root) if you want it available app-wide.
 */
@Component({
  selector: 'app-toast',
  standalone: true,
  templateUrl: './toast.html',
})
export class Toast {
  readonly snackbar = inject(SnackbarService);
}
