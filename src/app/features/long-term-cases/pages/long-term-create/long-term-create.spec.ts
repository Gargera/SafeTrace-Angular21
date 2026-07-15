import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LongTermCreate } from './long-term-create';

describe('LongTermCreate', () => {
  let component: LongTermCreate;
  let fixture: ComponentFixture<LongTermCreate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LongTermCreate],
    }).compileComponents();

    fixture = TestBed.createComponent(LongTermCreate);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
