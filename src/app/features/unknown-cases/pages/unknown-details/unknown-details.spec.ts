import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UnknownDetails } from './unknown-details';

describe('UnknownDetails', () => {
  let component: UnknownDetails;
  let fixture: ComponentFixture<UnknownDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UnknownDetails],
    }).compileComponents();

    fixture = TestBed.createComponent(UnknownDetails);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
