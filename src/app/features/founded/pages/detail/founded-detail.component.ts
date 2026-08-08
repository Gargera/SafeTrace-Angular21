import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { catchError, EMPTY, switchMap, tap } from 'rxjs';
import { FoundedService } from '../../services/founded.service';
import { PostDetailsResponseDTO } from '../../models/responses/post-details-response-dto';
import { environment } from '../../../../../environments/environment';
import { SnackbarService } from '../../../../shared/services/toast.service';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { ButtonComponent } from '../../../../shared/components/button/button';
import { extractErrorMessage } from '../../../../shared/helper/error.helper';
import { GenderBadgeDirective } from '../../../../shared/directives/gender-badge-directive';
import { Gender } from '../../../../shared/enums/gender';
import { CaseDetailsSkeletonComponent } from '../../../../shared/components/skeletons/case-details-skeleton/case-details-skeleton.component';

@Component({
  selector: 'app-founded-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, HeaderComponent, ButtonComponent, GenderBadgeDirective],
  imports: [CommonModule, RouterModule, HeaderComponent, ButtonComponent, CaseDetailsSkeletonComponent],
  templateUrl: './founded-detail.component.html',
})
export class FoundedDetailComponent implements OnInit {
  getGender(genderStr: string): Gender {
    return genderStr as Gender;
  }
  private readonly foundedService = inject(FoundedService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(SnackbarService);
  private readonly destroyRef = inject(DestroyRef);
  public readonly environment = environment;

  person = signal<PostDetailsResponseDTO | null>(null);
  isLoading = signal(true);
  hasError = signal(false);
  imageLoaded = signal(false);

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const id = Number(params.get('id'));
          if (!id) {
            this.router.navigate(['/founded']);
            return EMPTY;
          }

          this.isLoading.set(true);
          this.hasError.set(false);

          return this.foundedService.getDetails(id).pipe(
            catchError((err: unknown) => {
              this.hasError.set(true);
              this.isLoading.set(false);
              const errorMessage = extractErrorMessage(err, 'حدث خطأ أثناء تحميل بيانات الحالة');
              this.toast.error(errorMessage);
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => {
          this.person.set(res.data);
          this.isLoading.set(false);
        },
      });
  }

  goBack(): void {
    this.router.navigate(['/founded']);
  }

  onImageLoad(): void {
    this.imageLoaded.set(true);
  }
}
