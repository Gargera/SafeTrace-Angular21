import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CaseMediaUploaderComponent } from './case-media-uploader.component';
import { ImageService } from '../../../../shared/services/image.service';

describe('CaseMediaUploaderComponent', () => {
  let component: CaseMediaUploaderComponent;
  let fixture: ComponentFixture<CaseMediaUploaderComponent>;
  let mockImageService: any;

  beforeEach(async () => {
    mockImageService = {
      validate: (file: File, maxSize: number) => {
        if (file.name.includes('invalid')) {
          return { valid: false, errorMessage: 'الصورة غير صالحة' };
        }
        return { valid: true };
      }
    };

    await TestBed.configureTestingModule({
      imports: [CaseMediaUploaderComponent],
      providers: [
        { provide: ImageService, useValue: mockImageService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CaseMediaUploaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Create Mode', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('mode', 'create');
      fixture.detectChanges();
    });

    it('should initialize empty state', () => {
      expect(component.newPrimaryImage()).toBeNull();
      expect(component.newPhotos().length).toBe(0);
      expect(component.videoFile()).toBeNull();
    });

    it('should validate and set primary image via crop flow', () => {
      const file = new File([''], 'test.png', { type: 'image/png' });
      const mockEvent = { target: { files: [file] } };
      component.onPrimaryPhotoSelected(mockEvent as any);

      expect(component.cropImageEvent()).toBeTruthy();

      component.tempCroppedBlob.set(new Blob([''], { type: 'image/png' }));
      component.confirmCrop();

      expect(component.newPrimaryImage()).toBeTruthy();
      expect(component.localPrimaryError()).toBeNull();
    });

    it('should validate and set additional images', () => {
      const file1 = new File([''], 'test1.png', { type: 'image/png' });
      const file2 = new File([''], 'test2.png', { type: 'image/png' });
      component.onAdditionalPhotosSelected({ target: { files: [file1, file2] } } as any);
      expect(component.newPhotos().length).toBe(2);
      expect(component.newPhotos()[0]).toBe(file1);
    });

    it('should reject invalid additional image', () => {
      const file = new File([''], 'invalid.png', { type: 'image/png' });
      component.onAdditionalPhotosSelected({ target: { files: [file] } } as any);
      expect(component.newPhotos().length).toBe(0);
      expect(component.localAdditionalError()).toBe('الصورة غير صالحة');
    });

    it('should delete selected additional image', () => {
      const file1 = new File([''], 'test1.png', { type: 'image/png' });
      component.onAdditionalPhotosSelected({ target: { files: [file1] } } as any);
      expect(component.newPhotos().length).toBe(1);

      component.removeNewPhoto(0);
      expect(component.newPhotos().length).toBe(0);
    });

    it('should reject additional images when the dedicated primary field is empty', () => {
      const additional = new File([''], 'additional.png', { type: 'image/png' });
      component.onAdditionalPhotosSelected({ target: { files: [additional], value: '' } } as any);

      expect(component.validate()).toBe(false);
      expect(component.localPrimaryError()).toContain('برجاء إضافة وتأطير الصورة الأساسية.');
    });
  });

  describe('Update Mode', () => {
    const existingPhoto1 = { id: 1, imagePath: '/path1.jpg', isPrimary: true };
    const existingPhoto2 = { id: 2, imagePath: '/path2.jpg', isPrimary: false };

    beforeEach(() => {
      fixture.componentRef.setInput('mode', 'update');
      fixture.componentRef.setInput('existingPhotos', [existingPhoto1, existingPhoto2]);
      fixture.componentRef.setInput('initialPrimaryPhotoId', 1);

      component.ngOnInit();
      fixture.detectChanges();
    });

    it('should mark existing photos for deletion', () => {
      component.removeExistingPhoto(existingPhoto2);
      expect(component.deletedPhotoIds()).toContain(2);
      expect(component.localExistingPhotos().find(p => p.id === 2)).toBeUndefined();
    });

    it('validate() should fail if primary photo is removed and no new primary is selected', () => {
      component.removeExistingPhoto(existingPhoto1);
      const isValid = component.validate();
      expect(isValid).toBe(false);
      expect(component.localPrimaryError()).toContain('برجاء إضافة وتأطير الصورة الأساسية.');
    });

    it('should preserve initialPrimaryPhotoId when additional files selected', () => {
      expect(component.primaryPhotoId()).toBe(1);
      const file1 = new File([''], 'test1.png', { type: 'image/png' });
      component.onAdditionalPhotosSelected({ target: { files: [file1] } } as any);
      expect(component.primaryPhotoId()).toBe(1);
    });

    it('should retain and restore the existing primary while a replacement is staged then cleared', () => {
      const replacement = new File(['replacement'], 'replacement.png', { type: 'image/png' });
      component.onPrimaryPhotoSelected({ target: { files: [replacement], value: '' } } as any);
      component.tempCroppedBlob.set(new Blob(['cropped'], { type: 'image/jpeg' }));

      component.confirmCrop();

      expect(component.newPrimaryImage()).not.toBeNull();
      expect(component.primaryPhotoId()).toBe(1);
      expect(component.existingAdditionalPhotos().map((photo) => photo.id)).toEqual([2]);

      component.clearPrimary();

      expect(component.newPrimaryImage()).toBeNull();
      expect(component.existingPrimaryPhoto()?.id).toBe(1);
      expect(component.validate()).toBe(true);
    });

    it('should not expose a way to promote an existing additional image', () => {
      expect((component as any).setExistingAsPrimary).toBeUndefined();
    });

    it('should reject deleting the existing primary even when additional images remain', () => {
      component.removeExistingPhoto(existingPhoto1);

      expect(component.existingAdditionalPhotos().map((photo) => photo.id)).toEqual([2]);
      expect(component.validate()).toBe(false);
    });

    it('should mark only a direct existing-video removal as deletion', () => {
      fixture.componentRef.setInput('existingVideoUrl', '/old-video.mp4');
      fixture.detectChanges();

      component.removeVideo();

      expect(component.isExistingVideoDeleted()).toBe(true);
    });

    it('should keep the old video when a newly uploaded replacement is cancelled', () => {
      fixture.componentRef.setInput('existingVideoUrl', '/old-video.mp4');
      fixture.detectChanges();
      const replacement = new File(['video'], 'replacement.mp4', { type: 'video/mp4' });
      component.onVideoSelected({ target: { files: [replacement], value: '' } } as any);

      component.removeVideo();

      expect(component.videoFile()).toBeNull();
      expect(component.isExistingVideoDeleted()).toBe(false);
    });
  });

  describe('Form Validation Integration', () => {
    it('validate() should auto-confirm crop if active and blob exists', () => {
      component.cropImageEvent.set({} as any);
      component.tempCroppedBlob.set(new Blob([''], { type: 'image/png' }));

      const result = component.validate();

      expect(component.cropImageEvent()).toBeNull();
      // Wait, validate might fail if we don't have a newPrimaryImage/primaryPhotoId in tests
      // We are just testing if it closed the crop
    });

    it('validate() should fail if crop active but no blob (invalid state)', () => {
      component.cropImageEvent.set({} as any);
      component.tempCroppedBlob.set(null);

      const isValid = component.validate();

      expect(isValid).toBe(false);
      expect(component.localPrimaryError()).toContain('برجاء اعتماد الصورة (تأكيد القص) قبل الإرسال.');
    });
  });
});
