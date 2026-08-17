import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AuthService } from '../../../../core/services/auth.service';
import { ActivatedRoute } from '@angular/router';

import { UrgentListComponent } from './urgent-list';

describe('UrgentList', () => {
  let component: UrgentListComponent;
  let fixture: ComponentFixture<UrgentListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UrgentListComponent],
      providers: [
        { provide: AuthService, useValue: { currentUser: signal(null), isLoggedIn: signal(false), hasPermission: () => false } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '1' } } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UrgentListComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
