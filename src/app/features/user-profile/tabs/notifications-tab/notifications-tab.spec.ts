import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotificationsTab } from './notifications-tab';

describe('NotificationsTab', () => {
  let component: NotificationsTab;
  let fixture: ComponentFixture<NotificationsTab>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationsTab],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationsTab);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
