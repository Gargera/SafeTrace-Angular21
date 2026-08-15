import { of } from 'rxjs';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AuthService } from '../../../../core/services/auth.service';
import { ActivatedRoute } from '@angular/router';

import { LongTermDetails } from './long-term-details';

describe('LongTermDetails', () => {
  let component: LongTermDetails;
  let fixture: ComponentFixture<LongTermDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LongTermDetails],
      providers: [
        { provide: AuthService, useValue: { currentUser: signal(null), isLoggedIn: signal(false), hasPermission: () => false } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '1' }, queryParams: {}, data: {}, queryParamMap: { get: () => null } }, data: of({}), queryParams: of({}), params: of({id: '1'}), paramMap: of({get: () => '1'}) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LongTermDetails);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
