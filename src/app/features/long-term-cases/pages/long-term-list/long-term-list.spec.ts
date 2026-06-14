import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LongTermList } from './long-term-list';

describe('LongTermList', () => {
  let component: LongTermList;
  let fixture: ComponentFixture<LongTermList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LongTermList],
    }).compileComponents();

    fixture = TestBed.createComponent(LongTermList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
