import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UrgentList } from './urgent-list';

describe('UrgentList', () => {
  let component: UrgentList;
  let fixture: ComponentFixture<UrgentList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UrgentList],
    }).compileComponents();

    fixture = TestBed.createComponent(UrgentList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
