import { Component } from '@angular/core';
import { CaseCardSkeletonComponent } from '../case-card-skeleton/case-card-skeleton.component';

@Component({
  selector: 'app-case-skeleton-grid',
  standalone: true,
  imports: [CaseCardSkeletonComponent],
  template: `
    <section class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      @for (item of skeletonItems; track item) {
        <app-case-card-skeleton></app-case-card-skeleton>
      }
    </section>
  `,
})
export class CaseSkeletonGridComponent {
  skeletonItems = Array.from({ length: 12 }, (_, index) => index);
}
