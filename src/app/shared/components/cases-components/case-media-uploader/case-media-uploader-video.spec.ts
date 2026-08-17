import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CaseMediaUploaderComponent } from './case-media-uploader';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ImageCropperComponent } from 'ngx-image-cropper';
import { RouterTestingModule } from '@angular/router/testing';

describe('CaseMediaUploaderComponent - Video', () => {
  let component: CaseMediaUploaderComponent;
  let fixture: ComponentFixture<CaseMediaUploaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CaseMediaUploaderComponent, HttpClientTestingModule, RouterTestingModule, ReactiveFormsModule, ImageCropperComponent],
      providers: []
    }).compileComponents();

    fixture = TestBed.createComponent(CaseMediaUploaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create video preview when video is selected', () => {
    const file = new File([''], 'vid.mp4', { type: 'video/mp4' });
    const event = { target: { files: [file] } } as unknown as Event;

    // Stub validateVideoFile
    component.onVideoSelected(event);

    expect(component.videoFile()).toBe(file);
    expect(component.videoPreview()).toContain('blob:');
  });

  it('should remove video and clear preview', () => {
    component.videoFile.set(new File([''], 'vid.mp4'));
    component.videoPreview.set('blob:url');

    component.removeVideo();

    expect(component.videoFile()).toBeNull();
    expect(component.videoPreview()).toBeNull();
  });
});
