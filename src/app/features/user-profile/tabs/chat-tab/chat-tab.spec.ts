import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatTab } from './chat-tab';

describe('ChatTab', () => {
  let component: ChatTab;
  let fixture: ComponentFixture<ChatTab>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatTab],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatTab);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
