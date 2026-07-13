import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UrgentDeatils } from './urgent-deatils';

describe('UrgentDeatils', () => {
  let component: UrgentDeatils;
  let fixture: ComponentFixture<UrgentDeatils>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UrgentDeatils],
    }).compileComponents();

    fixture = TestBed.createComponent(UrgentDeatils);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
