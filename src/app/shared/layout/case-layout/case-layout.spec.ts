import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CaseLayout } from './case-layout';

describe('CaseLayout', () => {
  let component: CaseLayout;
  let fixture: ComponentFixture<CaseLayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CaseLayout],
    }).compileComponents();

    fixture = TestBed.createComponent(CaseLayout);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
