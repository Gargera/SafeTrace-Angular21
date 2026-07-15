import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UnknownCreate } from './unknown-create';

describe('UnknownCreate', () => {
  let component: UnknownCreate;
  let fixture: ComponentFixture<UnknownCreate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UnknownCreate],
    }).compileComponents();

    fixture = TestBed.createComponent(UnknownCreate);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
