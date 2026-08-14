import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { UnknownUpdate } from './unknown-update';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { UnknownCaseService } from '../../services/unknown-case.service';
import { SnackbarService } from '../../../../shared/services/toast.service';
import { CacheService } from '../../../../core/cache/cache.service';
import { Router, ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { CaseMediaUploaderComponent } from '../../../../shared/components/cases-components/case-media-uploader/case-media-uploader';
import { Component, input, output } from '@angular/core';
import { Gender } from '../../../../shared/enums/gender';

// --- Mocks ---
``
@Component({
  selector: 'app-case-media-uploader',
  standalone: true,
  template: '<div></div>',
})
class MockCaseMediaUploaderComponent {
  mode = input<'create' | 'update'>('create');
  existingPhotos = input<any[]>([]);
  existingVideoUrl = input<string | null>(null);
  initialPrimaryFile = input<File | null>(null);
  initialAdditionalFiles = input<File[]>([]);
  initialVideoFile = input<File | null>(null);
  initialDeletedPhotoIds = input<number[]>([]);
  initialPrimaryPhotoId = input<number | null>(null);
  errors = input<any>({});

  mediaChange = output<any>();

  triggerChange(payload: any) {
    this.mediaChange.emit(payload);
  }
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
      fName: 'Test',
      sName: 'Case',
      tName: '',
      lName: '',
      age: 30,
      gender: Gender.Male,
      government: 'القاهرة',
      city: 'مدينة نصر',
      street: 'الشارع الرئيسي',
      eventDate: '2023-10-10T00:00:00',
      description: 'Test description',
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

  const validEventDate = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  };

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
    fixture.detectChanges(); // triggers ngOnInit and loadCase
  });

  describe('1) Component Initialization', () => {
    it('should create UnknownUpdate successfully', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize signals correctly', () => {
      expect(component.currentStep()).toBe(1);
      expect(component.isSubmitting()).toBe(false);
      expect(component.errorMsg()).toBeNull();
      expect(component.caseId).toBe(1);
    });

    it('should load case data and patch form', () => {
      expect(mockService.getMyCaseByIdArgs).toContain(1);
      const v = component.form.getRawValue();
      expect(v.fName).toBe('Test');
      expect(v.sName).toBe('Case');
      expect(v.tName).toBe('');
      expect(v.lName).toBe('');
      expect(v.age).toBe(30);
      expect(v.gender).toBe(Gender.Male);
      expect(component.existingPhotos().length).toBe(1);
    });
  });

  describe('2) Form Behavior', () => {
    it('required fields are enforced', () => {
      component.form.patchValue({
        fName: '', sName: '', tName: '', lName: '', age: null, gender: null, government: '', city: '', street: '', eventDate: ''
      });
      expect(component.form.get('age')?.invalid).toBe(true);
      expect(component.form.get('gender')?.invalid).toBe(true);
      expect(component.form.get('government')?.invalid).toBe(true);
    });

    it('valid data makes the form valid', () => {
      component.form.patchValue({
        fName: 'احمد', sName: 'محمد', tName: '', lName: '', age: 25, gender: Gender.Male,
        government: 'القاهرة', city: 'مدينة نصر', street: 'شارع النصر', eventDate: validEventDate()
      });
      expect(component.form.valid).toBe(true);
    });
  });

  describe('3) Navigation (Steps)', () => {
    it('invalid data should keep the user on step 1', () => {
      component.form.patchValue({ age: null });
      component.nextStep();
      expect(component.currentStep()).toBe(1);
    });

    it('valid data should move from step 1 -> step 2', () => {
      component.form.patchValue({
        fName: '', sName: '', tName: '', lName: '', age: 25, gender: Gender.Male
      });
      component.nextStep();
      expect(component.currentStep()).toBe(2);
    });

    it('valid location data should move from step 2 -> step 3', () => {
      component.form.patchValue({
        fName: '', sName: '', tName: '', lName: '', age: 25, gender: Gender.Male,
        government: 'القاهرة', city: 'مدينة نصر', street: 'شارع النصر', eventDate: validEventDate()
      });
      component.currentStep.set(2);
      component.nextStep();
      expect(component.currentStep()).toBe(3);
    });
  });

  describe('4) Cache Draft Behavior', () => {
    it('should save draft after form value changes', async () => {
      component.form.patchValue({ age: 99 });
      await new Promise(resolve => setTimeout(resolve, 600)); // debounceTime 500ms
      const draft = mockCache.get(`UnknownUpdate_Draft_1`);
      expect(draft).toBeTruthy();
      expect(draft.formValue.age).toBe(99);
    });

    it('onMediaChange updates mediaPayload', () => {
      const payload = {
        primaryImage: new File([''], 'test.png'),
        additionalImages: [],
        video: null,
        deletedImageIds: [1],
        primaryPhotoId: null
      };
      component.onMediaChange(payload);
      expect(component.mediaPayload()).toEqual(payload);
    });
  });

  describe('5) Submit Behavior', () => {
    beforeEach(() => {
      component.form.patchValue({
        fName: 'احمد', sName: 'محمد', tName: '', lName: '', age: 25, gender: Gender.Male,
        government: 'القاهرة', city: 'مدينة نصر', street: 'شارع النصر', eventDate: validEventDate()
      });

      component.mediaPayload.set({
        primaryImage: null,
        additionalImages: [],
        video: null,
        deletedImageIds: [], // keep existing photo
        primaryPhotoId: 1
      });
    });

    it('should successfully submit and handle successful update', () => {
      component.onSubmit();

      expect(mockService.updateCaseArgs.length).toBe(1);

      const args = mockService.updateCaseArgs[0];
      expect(args.id).toBe(1);
      const req = args.request;
      expect(req.fName).toBe('احمد');
      expect(req.sName).toBe('محمد');
      expect(req.age).toBe(25);

      expect(mockCache.removeCalled).toBe(true);
      expect(component.isSubmitting()).toBe(false);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/unknown']);
      expect(mockSnackbar.successArgs.length).toBe(1);
    });
  });

  describe('6) Error Handling Behavior', () => {
    beforeEach(() => {
      component.form.patchValue({
        fName: 'احمد', sName: 'محمد', tName: '', lName: '', age: 25, gender: Gender.Male,
        government: 'القاهرة', city: 'مدينة نصر', street: 'شارع النصر', eventDate: validEventDate()
      });
      component.mediaPayload.set({
        primaryImage: null,
        additionalImages: [],
        video: null,
        deletedImageIds: [], // keep existing photo
        primaryPhotoId: 1
      });
    });

    it('API error sets error message and resets isSubmitting', () => {
      mockService.updateCaseResponse = throwError(() => ({ error: { message: 'Server error' } }));
      component.onSubmit();
      expect(component.isSubmitting()).toBe(false);
      expect(component.errorMsg()).toContain('Server error');
    });

    it('Validation error correctly handled via 400 status', () => {
      mockService.updateCaseResponse = throwError(() => ({
        status: 400,
        error: { errors: { 'PrimaryImage': ['الصورة غير صالحة'] } }
      }));
      component.onSubmit();
      expect(component.isSubmitting()).toBe(false);
      expect(component.mediaErrors().primary).toBe('الصورة غير صالحة');
      expect(component.errorMsg()).toBe('الصورة غير صالحة');
    });
  });
});
