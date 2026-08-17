import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AuthService } from '../../../../core/services/auth.service';
import { ActivatedRoute } from '@angular/router';

import { UnknownList } from './unknown-list';

describe('UnknownList', () => {
  let component: UnknownList;
  let fixture: ComponentFixture<UnknownList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UnknownList],
      providers: [
        { provide: AuthService, useValue: { currentUser: signal(null), isLoggedIn: signal(false), hasPermission: () => false } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '1' } } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UnknownList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
