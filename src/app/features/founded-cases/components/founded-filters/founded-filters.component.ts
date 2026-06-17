import { Component, EventEmitter, OnDestroy, Output, inject } from '@angular/core';

import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Subscription, debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-founded-filters',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './founded-filters.component.html',
})
export class FoundedFiltersComponent implements OnDestroy {
  private fb = inject(FormBuilder);
  private subscription = new Subscription();

  @Output()
  filtersChanged = new EventEmitter();

  form = this.fb.group({
    search: [''],
    ageCategory: [0],
    gender: [null],
  });

  constructor() {
    this.subscription.add(
      this.form.valueChanges
        .pipe(
          debounceTime(250),
          distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
        )
        .subscribe((value) => this.filtersChanged.emit(value)),
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
