import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UrgentCreate } from './urgent-create';

describe('UrgentCreate', () => {
  let component: UrgentCreate;
  let fixture: ComponentFixture<UrgentCreate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UrgentCreate],
    }).compileComponents();

    fixture = TestBed.createComponent(UrgentCreate);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
