import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { LongTermUpdate } from './long-term-update';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { LongTermCaseService } from '../../services/long-term-case.service';
import { CacheService } from '../../../../core/cache/cache.service';
import { SnackbarService } from '../../../../shared/services/toast.service';
import { ImageService } from '../../../../shared/services/image.service';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError, Subject } from 'rxjs';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Gender } from '../../../../shared/enums/gender';
import { RelationType } from '../../../../shared/enums/relation-type';
import { CaseMediaUploaderComponent } from '../../../../shared/components/cases-components/case-media-uploader/case-media-uploader';

@Component({
  selector: 'app-case-media-uploader',
  standalone: true,
  template: '<div></div>',
})
class MockCaseMediaUploaderComponent {
  @Input() mode: 'create' | 'update' = 'create';
  @Input() existingPhotos: any[] = [];
  @Input() existingVideoUrl: string | null = null;
  @Input() initialPrimaryFile: File | null = null;
  @Input() initialAdditionalFiles: File[] = [];
  @Input() initialVideoFile: File | null = null;
  @Input() initialDeletedPhotoIds: number[] = [];
  @Input() initialPrimaryPhotoId: number | null = null;
  @Input() errors: any = {};
  @Output() mediaChange = new EventEmitter<any>();
}

class MockLongTermCaseService {
  updateCaseArgs: any[] = [];
  getMyCaseByIdResponse: any = of({
    status: 200,
    isSuccess: true,
    data: {
      fName: 'احمد',
      lName: 'محمد',
      age: 25,
      gender: Gender.Male,
      relation: RelationType.Brother,
      government: 'القاهرة',
      city: 'مدينة نصر',
      street: 'شارع النصر',
      eventDate: '2023-10-10T00:00:00Z',
      photos: [{ id: 1, isPrimary: true, imagePath: '/img1.jpg' }]
    },
  });

  updateCaseResponse: any = of({
    status: 200,
    isSuccess: true,
    data: true,
  });

  getMyCaseById(id: number) {
    return this.getMyCaseByIdResponse;
  }

  updateCase(id: number, request: any) {
    this.updateCaseArgs.push({ id, request });
    return this.updateCaseResponse;
  }
}

class MockSnackbarService {
  successArgs: string[] = [];
  errorArgs: string[] = [];
  success(msg: string) { this.successArgs.push(msg); }
  error(msg: string) { this.errorArgs.push(msg); }
}

class MockCacheService {
  cache: { [key: string]: any } = {};
  removeCalled = false;
  get(key: string) { return this.cache[key] || null; }
  set(key: string, value: any) { this.cache[key] = value; }
  remove(key: string) {
    this.removeCalled = true;
    delete this.cache[key];
  }
}

class MockImageService {
  validate(file: File, maxSize: number) {
    if (file.name.includes('invalid')) {
      return { valid: false, errorMessage: 'الصورة غير صالحة' };
    }
    return { valid: true };
  }
}

describe('LongTermUpdate', () => {
  let component: LongTermUpdate;
  let fixture: ComponentFixture<LongTermUpdate>;
  let mockService: MockLongTermCaseService;
  let mockCache: MockCacheService;
  let mockRouter: any;
  let mockSnackbar: MockSnackbarService;
  let mockActivatedRoute: any;

  beforeEach(async () => {
    mockService = new MockLongTermCaseService();
    mockCache = new MockCacheService();
    mockRouter = { navigate: vi.fn() };
    mockSnackbar = new MockSnackbarService();
    mockActivatedRoute = { snapshot: { paramMap: { get: () => '1' } } };

    await TestBed.configureTestingModule({
      imports: [LongTermUpdate, ReactiveFormsModule],
      providers: [
        FormBuilder,
        { provide: LongTermCaseService, useValue: mockService },
        { provide: CacheService, useValue: mockCache },
        { provide: Router, useValue: mockRouter },
        { provide: SnackbarService, useValue: mockSnackbar },
        { provide: ImageService, useClass: MockImageService },
        { provide: ActivatedRoute, useValue: mockActivatedRoute }
      ],
    })
      .overrideComponent(LongTermUpdate, {
        remove: { imports: [CaseMediaUploaderComponent] },
        add: { imports: [MockCaseMediaUploaderComponent] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(LongTermUpdate);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('1) Component Initialization', () => {
    it('should create LongTermUpdate successfully', () => {
      expect(component).toBeTruthy();
    });

    it('should load case data and set signals', () => {
      expect(component.isLoading()).toBe(false);
      expect(component.form.get('fName')?.value).toBe('احمد');
      expect(component.form.get('age')?.value).toBe(25);
      expect(component.existingPhotos().length).toBe(1);
    });
  });

  describe('2) Form Behavior', () => {
    it('form is valid after loading valid case data', () => {
      expect(component.form.valid).toBe(true);
    });
  });

  describe('3) Navigation (Steps)', () => {
    it('valid data should move from step 1 -> step 2', () => {
      component.nextStep();
      expect(component.currentStep()).toBe(2);
    });
  });

  describe('4) Submission', () => {
    beforeEach(() => {
      // simulate media uploader payload
      component.mediaPayload.set({
        primaryImage: null,
        additionalImages: [],
        video: null,
        deletedImageIds: [],
        primaryPhotoId: 1
      });
      component.policeReport.set(new File([''], 'police.jpg', { type: 'image/jpeg' }));
    });

    it('should submit successfully', () => {
      component.onSubmit();
      expect(mockService.updateCaseArgs.length).toBe(1);
      expect(mockCache.removeCalled).toBe(true);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/long-term', '1']);
      expect(mockSnackbar.successArgs).toContain('تم تحديث بيانات الحالة بنجاح.');
    });

    it('handles API errors', () => {
      mockService.updateCaseResponse = throwError(() => ({ error: { message: 'Server error' } }));
      component.onSubmit();
      expect(component.errorMsg()).toContain('Server error');
    });

    it('handles validation 400 errors for media', () => {
      mockService.updateCaseResponse = throwError(() => ({
        status: 400,
        error: { errors: { 'PrimaryImage': ['الصورة غير صالحة'], 'PoliceReportImage': ['محضر مزيف'] } }
      }));
      component.onSubmit();
      expect(component.mediaErrors().primary).toContain('الصورة غير صالحة');
      expect(component.mediaErrors().policeReport).toContain('محضر مزيف');
    });
  });
});
