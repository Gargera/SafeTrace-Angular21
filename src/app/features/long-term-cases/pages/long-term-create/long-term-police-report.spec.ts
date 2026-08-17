import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LongTermCreate } from './long-term-create';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/common/Router/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { provideAnimations } from '@angular/platform-browser/animations';

describe('LongTermCreate - Police Report Media', () => {
  let component: LongTermCreate;
  let fixture: ComponentFixture<LongTermCreate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LongTermCreate, HttpClientTestingModule, RouterTestingModule, ReactiveFormsModule],
      providers: [provideAnimations()]
    }).compileComponents();

    fixture = TestBed.createComponent(LongTermCreate);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should generate a preview when police report is selected', () => {
    const file = new File([''], 'police.jpg', { type: 'image/jpeg' });
    const event = { target: { files: [file] } } as unknown as Event;
    
    // Stub URL.createObjectURL
    global.URL.createObjectURL = vitest.fn(() => 'blob:url');
    
    component.onPoliceReportSelected(event);
    
    expect(component.policeReport()).toBe(file);
    expect(component.policeReportPreview()).toBe('blob:url');
  });

  it('should remove police report and clear preview', () => {
    component.policeReport.set(new File([''], 'police.jpg'));
    component.policeReportPreview.set('blob:url');
    
    global.URL.revokeObjectURL = vitest.fn();
    
    component.removePoliceReport();
    
    expect(component.policeReport()).toBeNull();
    expect(component.policeReportPreview()).toBeNull();
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:url');
  });
});
