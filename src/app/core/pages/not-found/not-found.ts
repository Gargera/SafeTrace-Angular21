import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

import { ButtonComponent } from '../../../shared/components/button/button';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterModule, ButtonComponent],
  templateUrl: './not-found.html',
  styleUrl: './not-found.css'
})
export class NotFound implements OnInit {
  private router = inject(Router);

  ngOnInit(): void {}
}