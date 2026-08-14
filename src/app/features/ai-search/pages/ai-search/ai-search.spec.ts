import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AiSearch } from './ai-search';

describe('AiSearch', () => {
  let component: AiSearch;
  let fixture: ComponentFixture<AiSearch>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiSearch],


    }).compileComponents();

    fixture = TestBed.createComponent(AiSearch);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
