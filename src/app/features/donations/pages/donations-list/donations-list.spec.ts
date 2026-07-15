import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DonationsList } from './donations-list';

describe('DonationsList', () => {
  let component: DonationsList;
  let fixture: ComponentFixture<DonationsList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DonationsList],
    }).compileComponents();

    fixture = TestBed.createComponent(DonationsList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
