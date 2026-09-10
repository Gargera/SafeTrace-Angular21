import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LongTermCreate } from './long-term-create';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';

describe('LongTermCreate - Police Report Media', () => {
  let component: LongTermCreate;
  let fixture: ComponentFixture<LongTermCreate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LongTermCreate, HttpClientTestingModule, RouterTestingModule, ReactiveFormsModule],
      providers: []
    }).compileComponents();

    fixture = TestBed.createComponent(LongTermCreate);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should generate a preview when police report is selected', () => {
    const file = new File([''], 'police.jpg', { type: 'image/jpeg' });
    const event = { target: { files: [file] } } as unknown as Event;

    // Stub URL.createObjectURL
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:url');

    component.onPoliceReportSelected(event);

    expect(component.policeReport()).toBe(file);
    expect(component.policeReportPreview()).toBe('blob:url');
  });

  it('should remove police report and clear preview', () => {
    component.policeReport.set(new File([''], 'police.jpg'));
    component.policeReportPreview.set('blob:url');

    vi.spyOn(URL, 'revokeObjectURL');

    component.removePoliceReport();

    expect(component.policeReport()).toBeNull();
    expect(component.policeReportPreview()).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:url');
  });
});
