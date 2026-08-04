import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ButtonComponent } from '../../../shared/components/button/button';

@Component({
  selector: 'app-access-denied',
  imports: [RouterModule, ButtonComponent],
  templateUrl: './access-denied.html',
  styleUrl: './access-denied.css',
})
export class AccessDenied {}
