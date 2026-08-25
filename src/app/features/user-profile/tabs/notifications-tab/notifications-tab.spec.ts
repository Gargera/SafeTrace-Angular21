import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AuthService } from '../../../../core/services/auth.service';

import { NotificationsTab } from './notifications-tab';

describe('NotificationsTab', () => {
  let component: NotificationsTab;
  let fixture: ComponentFixture<NotificationsTab>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationsTab],
      providers: [
        { provide: AuthService, useValue: { currentUser: signal(null), isLoggedIn: signal(false), hasPermission: () => false } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationsTab);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
