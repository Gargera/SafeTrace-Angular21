import { of } from 'rxjs';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AuthService } from '../../../../core/services/auth.service';
import { ActivatedRoute } from '@angular/router';

import { UrgentDetails } from './urgent-details';

describe('UrgentDetails', () => {
  let component: UrgentDetails;
  let fixture: ComponentFixture<UrgentDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UrgentDetails],
      providers: [
        { provide: AuthService, useValue: { currentUser: signal(null), isLoggedIn: signal(false), hasPermission: () => false } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '1' }, queryParams: {}, data: {}, queryParamMap: { get: () => null } }, data: of({}), queryParams: of({}), params: of({id: '1'}), paramMap: of({get: () => '1'}) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UrgentDetails);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
