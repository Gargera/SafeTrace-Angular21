import { of } from 'rxjs';
import { SOCIAL_AUTH_CONFIG } from '@abacritt/angularx-social-login';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccessDenied } from './access-denied';

describe('AccessDenied', () => {
  let component: AccessDenied;
  let fixture: ComponentFixture<AccessDenied>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccessDenied],

      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '1' }, queryParams: {}, data: {}, queryParamMap: { get: () => null } }, data: of({}), queryParams: of({}), params: of({id: '1'}), paramMap: of({get: () => '1'}) } },
        { provide: SOCIAL_AUTH_CONFIG, useValue: { autoLogin: false, providers: [] } }
      ],


    }).compileComponents();

    fixture = TestBed.createComponent(AccessDenied);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
