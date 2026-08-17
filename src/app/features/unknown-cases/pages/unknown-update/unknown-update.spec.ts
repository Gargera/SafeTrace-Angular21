import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { UnknownUpdate, UNKNOWN_UPDATE_DRAFT_KEY_PREFIX } from './unknown-update';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { UnknownCaseService } from '../../services/unknown-case.service';
import { SnackbarService } from '../../../../shared/services/toast.service';
import { CacheService } from '../../../../core/cache/cache.service';
import { GeocodingService } from '../../../../core/services/geocoding/geocoding.service';
import { Router, ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { CaseMediaUploaderComponent } from '../../../../shared/components/cases-components/case-media-uploader/case-media-uploader';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Gender } from '../../../../shared/enums/gender';

beforeAll(() => {
  Object.defineProperty(window, 'ResizeObserver', {
    writable: true,
    value: class {
      observe() { }
      unobserve() { }
      disconnect() { }
    },
  });
});

// --- Mocks ---
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

class MockUnknownCaseService {
  updateCaseArgs: any[] = [];
  updateCaseResponse: any = of({
    status: 200,
    isSuccess: true,
    data: { isCreated: true, caseId: 101 },
  });
  updateCase(id: number, request: any) {
    this.updateCaseArgs.push({ id, request });
    return this.updateCaseResponse;
  }

  getMyCaseByIdArgs: number[] = [];
  getMyCaseByIdResponse: any = of({
    status: 200,
    isSuccess: true,
    data: {
      id: 1,
      fName: 'احمد',
      sName: 'محمد',
      tName: 'سعيد',
      lName: 'محمود',
      age: 25,
      gender: Gender.Male,
      government: 'القاهرة',
      city: 'مدينة نصر',
      street: 'الشارع الرئيسي',
      eventDate: '2023-10-10T00:00:00',
      description: 'Test',
      photos: [
        { id: 1, imagePath: '/path/to/img.jpg', isPrimary: true }
      ]
    },
  });
  getMyCaseById(id: number) {
    this.getMyCaseByIdArgs.push(id);
    return this.getMyCaseByIdResponse;
  }
}

class MockGeocodingService {
  reverseGeocodeResponse: any = of('Test Address');
  reverseGeocodeArgs: any[] = [];
  reverseGeocode(lat: number, lng: number) {
    this.reverseGeocodeArgs.push({ lat, lng });
    return this.reverseGeocodeResponse;
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

describe('UnknownUpdate', () => {
  let component: UnknownUpdate;
  let fixture: ComponentFixture<UnknownUpdate>;
  let mockService: MockUnknownCaseService;
  let mockCache: MockCacheService;
  let mockRouter: any;
  let mockSnackbar: MockSnackbarService;

  beforeEach(async () => {
    mockService = new MockUnknownCaseService();
    mockCache = new MockCacheService();
    mockRouter = { navigate: vi.fn() };
    mockSnackbar = new MockSnackbarService();

    await TestBed.configureTestingModule({
      imports: [UnknownUpdate, ReactiveFormsModule],
      providers: [
        FormBuilder,
        { provide: UnknownCaseService, useValue: mockService },
        { provide: CacheService, useValue: mockCache },
        { provide: GeocodingService, useClass: MockGeocodingService },
        { provide: Router, useValue: mockRouter },
        { provide: SnackbarService, useValue: mockSnackbar },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => '1' } } }
        }
      ],
    })
      .overrideComponent(UnknownUpdate, {
        remove: { imports: [CaseMediaUploaderComponent] },
        add: { imports: [MockCaseMediaUploaderComponent] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(UnknownUpdate);
    component = fixture.componentInstance;

    // Mock ViewChild mediaUploader as signal
    component.mediaUploader = (() => ({
      validateMedia: () => ({ valid: true, message: null }),
      validate: () => ({ valid: true, message: null })
    })) as any;

    fixture.detectChanges(); // triggers ngOnInit and loadCase
  });

  const fillPersonData = () => {
    component.form.patchValue({
      fName: 'سالم', lName: 'خالد', age: 30, gender: Gender.Male
    });
  };

  const fillLocationForm = () => {
    component.form.patchValue({
      government: 'الإسكندرية', city: 'سموحة', street: 'شارع فوزي معاذ', eventDate: '2023-11-11T12:00'
    });
  };

  // 1) Component Initialization
  describe('1) Component Initialization', () => {
    it('should create component', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize default signals', () => {
      expect(component.currentStep()).toBe(1);
      expect(component.isSubmitting()).toBe(false);
      expect(component.errorMsg()).toBeNull();
      expect(component.caseId).toBe(1);
    });

    it('should load case data and patch form', () => {
      expect(mockService.getMyCaseByIdArgs).toContain(1);
      const v = component.form.getRawValue();
      expect(v.fName).toBe('احمد');
      expect(v.sName).toBe('محمد');
      expect(v.age).toBe(25);
      expect(v.gender).toBe(Gender.Male);
      expect(component.existingPhotos().length).toBe(1);
    });

    it('should return correct step header', () => {
      expect(component.stepHeader()?.title).toBe('تحديث بيانات المفقود');
    });
  });

  // 2) Form Validation
  describe('2) Form Validation', () => {
    it('should require mandatory fields', () => {
      component.form.patchValue({
        fName: '', lName: '', age: null, gender: null, government: ''
      });
      expect(component.form.get('age')?.invalid).toBe(true);
      expect(component.form.get('gender')?.invalid).toBe(true);
    });

    it('should reject non arabic names', () => {
      component.form.patchValue({ fName: 'Ahmed' });
      expect(component.form.get('fName')?.invalid).toBe(true);
    });

    it('old removed controls do NOT exist', () => {
      expect(component.form.contains('isNameKnown')).toBe(false);
      expect(component.form.contains('name')).toBe(false);
    });

    it('current four name controls are used and follow business rules', () => {
      expect(component.form.contains('fName')).toBe(true);
      expect(component.form.contains('sName')).toBe(true);
      expect(component.form.contains('tName')).toBe(true);
      expect(component.form.contains('lName')).toBe(true);

      // Names are optional for unknown case
      component.form.patchValue({ fName: '', sName: '', tName: '', lName: '' });
      expect(component.form.get('fName')?.valid).toBe(true);
      expect(component.form.get('sName')?.valid).toBe(true);
    });

    it('future dates must be rejected according to pastDate validator', () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
      component.form.patchValue({ eventDate: futureDate });
      expect(component.form.get('eventDate')?.invalid).toBe(true);
      expect(component.form.get('eventDate')?.errors?.['pastDate']).toBeTruthy();
    });
  });

  // 3) Step Navigation
  describe('3) Step Navigation', () => {
    it('should not move when step 1 invalid', () => {
      component.currentStep.set(1);
      component.form.patchValue({ age: null }); // Make it invalid
      component.nextStep();
      expect(component.currentStep()).toBe(1);
    });

    it('should move step 1 to step 2', () => {
      component.currentStep.set(1);
      fillPersonData();
      component.nextStep();
      expect(component.currentStep()).toBe(2);
    });
  });

  // 4) Cache / Draft
  describe('4) Cache / Draft', () => {
    it('should save draft after changes', async () => {
      component.form.patchValue({ age: 30 });
      await new Promise(resolve => setTimeout(resolve, 600));
      const draft = mockCache.get(`${UNKNOWN_UPDATE_DRAFT_KEY_PREFIX}1`);
      expect(draft).toBeTruthy();
      expect(draft.formValue.age).toBe(30);
    });

    it('should restore existing draft from cache', () => {
      const file = new File([''], 'test.png');
      mockCache.cache[`${UNKNOWN_UPDATE_DRAFT_KEY_PREFIX}1`] = {
        formValue: { fName: 'سالم', age: 40 },
        currentStep: 2,
        newPrimaryImage: file,
        newAdditionalImages: [],
        newVideo: null,
        deletedPhotoIds: [1],
        primaryPhotoId: 2
      };

      const newFixture = TestBed.createComponent(UnknownUpdate);
      const newComponent = newFixture.componentInstance;
      newFixture.detectChanges();

      expect(newComponent.form.get('age')?.value).toBe(40);
      expect(newComponent.currentStep()).toBe(2);
      expect(newComponent.mediaPayload().primaryImage).toBe(file);
      expect(newComponent.mediaPayload().deletedImageIds).toEqual([1]);
    });
  });

  // 5) Media Handling
  describe('5) Media Handling', () => {
    it('should update media payload', () => {
      const file = new File([''], 'test.png');
      component.onMediaChange({
        primaryImage: file, additionalImages: [], video: null, deletedImageIds: [1], primaryPhotoId: 2
      });
      expect(component.mediaPayload().primaryImage).toBe(file);
      expect(component.mediaPayload().deletedImageIds).toEqual([1]);
    });

    it('should clear media errors', () => {
      component.mediaErrors.set({ primary: 'error' });
      component.onMediaChange({
        primaryImage: new File([''], 'a.png'), additionalImages: [], video: null, deletedImageIds: [], primaryPhotoId: null
      });
      expect(component.mediaErrors()).toEqual({});
    });
  });

  // 7) Request Builder Verification
  describe('7) Request Builder Verification', () => {
    it('should build request payload matching current state', () => {
      fillPersonData();
      fillLocationForm();
      const file = new File([''], 'primary.png');
      component.onMediaChange({
        primaryImage: file, additionalImages: [], video: null, deletedImageIds: [1], primaryPhotoId: null
      });

      const request = (component as any).buildUpdateRequest();

      expect(request.fName).toBe('سالم');
      expect(request.primaryImage).toBe(file);
      expect(request.deletedPhotosIds).toEqual([1]);
    });
  });

  // 8) Submit Success
  describe('8) Submit Success', () => {
    beforeEach(() => {
      fillPersonData();
      fillLocationForm();
      component.onMediaChange({
        primaryImage: new File([''], 'test.png'), additionalImages: [], video: null, deletedImageIds: [], primaryPhotoId: null
      });
    });

    it('should submit successfully', () => {
      mockService.updateCaseResponse = of({ isSuccess: true, data: { isCreated: true } });
      component.onSubmit();

      expect(mockService.updateCaseArgs.length).toBe(1);
      expect(mockCache.removeCalled).toBe(true);
      expect(mockSnackbar.successArgs.length).toBe(1);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/unknown', '1']);
    });
  });

  // 9) Error Handling
  describe('9) Error Handling', () => {
    beforeEach(() => {
      fillPersonData();
      fillLocationForm();
      component.onMediaChange({
        primaryImage: new File([''], 'test.png'), additionalImages: [], video: null, deletedImageIds: [], primaryPhotoId: null
      });
    });

    it('Server Error 500 sets errorMsg', () => {
      mockService.updateCaseResponse = throwError(() => ({ status: 500, error: { message: 'Server error' } }));
      component.onSubmit();
      expect(component.errorMsg()).not.toBeNull();
      expect(component.isSubmitting()).toBe(false);
    });

    it('Network Error (status 0) sets network error message', () => {
      mockService.updateCaseResponse = throwError(() => ({ status: 0, message: '0 Unknown Error', name: 'HttpErrorResponse' }));
      component.onSubmit();
      expect(component.errorMsg()).toContain('تعذر الاتصال بالإنترنت');
    });

    it('Validation Error 400 sets media errors', () => {
      mockService.updateCaseResponse = throwError(() => ({
        status: 400,
        error: { errors: { PrimaryImage: ['الصورة غير صالحة'] } }
      }));
      component.onSubmit();
      expect(component.isSubmitting()).toBe(false);
      expect(component.mediaErrors().primary).toBe('الصورة غير صالحة');
      expect(component.errorMsg()).toBe('الصورة غير صالحة');
    });
  });

  // 10) Refactor Safety Tests
  describe('10) Refactor Safety Tests', () => {
    it('getSubmissionDependencies returns exact flow config', () => {
      const deps = (component as any).getSubmissionDependencies();
      expect(deps.successRoute).toEqual(['/unknown', '1']);
      expect(deps.successMessage).toBe('تم تعديل بيانات الحالة بنجاح، وسيتم مراجعتها مرة أخرى من قِبَل الإدارة قبل النشر.');
      expect(deps.draftKey).toBe(`${UNKNOWN_UPDATE_DRAFT_KEY_PREFIX}1`);
      expect(deps.isSubmitting).toBe(component.isSubmitting);
    });
  });
});
