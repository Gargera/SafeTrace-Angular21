import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CaseHeaderComponent } from './case-header.component';

describe('CaseHeaderComponent', () => {
  let component: CaseHeaderComponent;
  let fixture: ComponentFixture<CaseHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CaseHeaderComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CaseHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
