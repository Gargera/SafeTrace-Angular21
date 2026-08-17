import { of } from 'rxjs';
import { SOCIAL_AUTH_CONFIG } from '@abacritt/angularx-social-login';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ComplaintsList } from './complaints-list';

describe('ComplaintsList', () => {
  let component: ComplaintsList;
  let fixture: ComponentFixture<ComplaintsList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComplaintsList],

      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '1' }, queryParams: {}, data: {}, queryParamMap: { get: () => null } }, data: of({}), queryParams: of({}), params: of({id: '1'}), paramMap: of({get: () => '1'}) } },
        { provide: SOCIAL_AUTH_CONFIG, useValue: { autoLogin: false, providers: [] } }
      ],

    }).compileComponents();

    fixture = TestBed.createComponent(ComplaintsList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
