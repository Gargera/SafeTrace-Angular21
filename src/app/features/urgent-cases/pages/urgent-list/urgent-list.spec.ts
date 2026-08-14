import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UrgentListComponent } from './urgent-list';


describe('UrgentList', () => {
  let component: UrgentListComponent;
  let fixture: ComponentFixture<UrgentListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UrgentListComponent],


    }).compileComponents();

    fixture = TestBed.createComponent(UrgentListComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
