import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardStatistics } from './dashboard-statistics';

describe('DashboardStatistics', () => {
  let component: DashboardStatistics;
  let fixture: ComponentFixture<DashboardStatistics>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardStatistics],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardStatistics);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
