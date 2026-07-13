import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UrgentDetails } from './urgent-details';

describe('UrgentDetails', () => {
  let component: UrgentDetails;
  let fixture: ComponentFixture<UrgentDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UrgentDetails],
    }).compileComponents();

    fixture = TestBed.createComponent(UrgentDetails);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
