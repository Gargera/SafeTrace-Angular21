import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { FoundedService } from '../services/founded.service';
import { PostDetailsResponseDTO } from '../models/founded.models';
import { environment } from '../../../../environments/environment';
import { SnackbarService } from '../../../core/services/toast.service';
import { CaseHeaderComponent } from '../../../shared/components/cases-components/case-header/case-header.component';
import { ButtonComponent } from '../../../shared/components/button/button';

@Component({
  selector: 'app-founded-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, CaseHeaderComponent, ButtonComponent],
  templateUrl: './founded-detail.component.html',
})
export class FoundedDetailComponent implements OnInit, OnDestroy {
  private readonly foundedService = inject(FoundedService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(SnackbarService);
  private readonly destroy$ = new Subject<void>();
  public readonly environment = environment;

  person = signal<PostDetailsResponseDTO | null>(null);
  isLoading = signal(true);
  hasError = signal(false);
  imageLoaded = signal(false);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.router.navigate(['/founded']);
      return;
    }
    this.loadDetails(id);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  goBack(): void {
    this.router.navigate(['/founded']);
  }

  onImageLoad(): void {
    this.imageLoaded.set(true);
  }

  private loadDetails(id: number): void {
    this.isLoading.set(true);
    this.hasError.set(false);

    this.foundedService
      .getDetails(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.person.set(res.data);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.hasError.set(true);
          this.isLoading.set(false);
          const errorMessage = err.error?.detail || err.error?.message || 'حدث خطأ أثناء تحميل بيانات الحالة';
          this.toast.error(errorMessage);
        },
      });
  }
}
