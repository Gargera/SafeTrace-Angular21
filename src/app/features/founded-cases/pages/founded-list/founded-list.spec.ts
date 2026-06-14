import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FoundedList } from './founded-list';

describe('FoundedList', () => {
  let component: FoundedList;
  let fixture: ComponentFixture<FoundedList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FoundedList],
    }).compileComponents();

    fixture = TestBed.createComponent(FoundedList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
