import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';

import { CaseFiltersComponent } from './case-filters.component';

describe('CaseFiltersComponent', () => {
  let component: CaseFiltersComponent;
  let fixture: ComponentFixture<CaseFiltersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CaseFiltersComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CaseFiltersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit filterChange automatically when a filter value changes', fakeAsync(() => {
    const emitSpy = jasmine.createSpy('filterChange');
    component.filterChange.subscribe(emitSpy);

    component.filterForm.get('gender')?.setValue(1);

    tick();

    expect(emitSpy).toHaveBeenCalled();
  }));

  it('should debounce fullName changes before emitting', fakeAsync(() => {
    const emitSpy = jasmine.createSpy('filterChange');
    component.filterChange.subscribe(emitSpy);

    component.filterForm.get('fullName')?.setValue('Ali');

    expect(emitSpy).not.toHaveBeenCalled();

    tick(400);

    expect(emitSpy).toHaveBeenCalledTimes(1);
  }));
});
