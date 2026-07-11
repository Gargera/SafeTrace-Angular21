import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ComplaintsList } from './complaints-list';

describe('ComplaintsList', () => {
  let component: ComplaintsList;
  let fixture: ComponentFixture<ComplaintsList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComplaintsList],
    }).compileComponents();

    fixture = TestBed.createComponent(ComplaintsList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
