import { ComponentFixture, TestBed } from '@angular/core/testing';

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

  it('emits a sanitized filter request when form changes', async () => {
    const emitted: Array<{
      fullName: string | null;
      ageSort: number | null;
      dateSort: number | null;
    }> = [];

    component.filterChange.subscribe((request) => {
      emitted.push({
        fullName: request.fullName,
        ageSort: request.ageSort,
        dateSort: request.dateSort,
      });
    });

    fixture.detectChanges();
    component.filterForm.patchValue({ fullName: 'أحمد' });
    await new Promise(resolve => setTimeout(resolve, 350));

    expect(emitted.length).toBe(1);
    expect(emitted[0].fullName).toBe('أحمد');
    expect(emitted[0].ageSort).toBeNull();
    expect(emitted[0].dateSort).toBeNull();
  });
});
