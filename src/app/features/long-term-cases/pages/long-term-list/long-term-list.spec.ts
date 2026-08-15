import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AuthService } from '../../../../core/services/auth.service';
import { ActivatedRoute } from '@angular/router';

import { LongTermList } from './long-term-list';

describe('LongTermList', () => {
  let component: LongTermList;
  let fixture: ComponentFixture<LongTermList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LongTermList],
      providers: [
        { provide: AuthService, useValue: { currentUser: signal(null), isLoggedIn: signal(false), hasPermission: () => false } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '1' } } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LongTermList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
