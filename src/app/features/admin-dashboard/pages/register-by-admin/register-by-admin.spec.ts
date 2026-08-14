import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegisterByAdmin } from './register-by-admin';

describe('RegisterByAdmin', () => {
  let component: RegisterByAdmin;
  let fixture: ComponentFixture<RegisterByAdmin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterByAdmin],

    }).compileComponents();

    fixture = TestBed.createComponent(RegisterByAdmin);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
