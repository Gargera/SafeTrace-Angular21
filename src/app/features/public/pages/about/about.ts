import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ButtonComponent } from '../../../../shared/components/button/button';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-about',
  imports: [CommonModule, RouterModule, ButtonComponent],
  templateUrl: './about.html',
  styleUrl: './about.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class About {
  authService = inject(AuthService);
}