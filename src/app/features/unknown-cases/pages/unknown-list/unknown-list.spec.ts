import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UnknownList } from './unknown-list';

describe('UnknownList', () => {
  let component: UnknownList;
  let fixture: ComponentFixture<UnknownList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UnknownList],
    }).compileComponents();

    fixture = TestBed.createComponent(UnknownList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
