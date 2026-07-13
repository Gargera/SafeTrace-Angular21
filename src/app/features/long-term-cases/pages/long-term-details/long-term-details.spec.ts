import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LongTermDetails } from './long-term-details';

describe('LongTermDetails', () => {
  let component: LongTermDetails;
  let fixture: ComponentFixture<LongTermDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LongTermDetails],
    }).compileComponents();

    fixture = TestBed.createComponent(LongTermDetails);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
