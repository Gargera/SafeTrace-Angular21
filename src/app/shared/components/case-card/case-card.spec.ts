import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CaseCard } from './case-card';

describe('CaseCard', () => {
  let component: CaseCard;
  let fixture: ComponentFixture<CaseCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CaseCard],
    }).compileComponents();

    fixture = TestBed.createComponent(CaseCard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
