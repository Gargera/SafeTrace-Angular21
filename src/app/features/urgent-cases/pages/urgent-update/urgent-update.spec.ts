import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { UrgentUpdate } from './urgent-update';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { UrgentCaseService } from '../../services/urgent-case.service';
import { SnackbarService } from '../../../../shared/services/toast.service';
import { CacheService } from '../../../../core/cache/cache.service';
import { GeocodingService } from '../../../../core/services/geocoding/geocoding.service';
import { Router, ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { CaseMediaUploaderComponent } from '../../../../shared/components/cases-components/case-media-uploader/case-media-uploader';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Gender } from '../../../../shared/enums/gender';
import { RelationType } from '../../../../shared/enums/relation-type';

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

@Component({
  selector: 'app-map-location-picker',
  standalone: true,
  template: '<div></div>',
})
class MockMapLocationPickerComponent {
  @Input() isOpen = false;
  @Input() initialLat: number | null = null;
  @Input() initialLng: number | null = null;
  @Input() initialAddress: string | null = null;
  @Output() confirmLocation = new EventEmitter<{lat: number, lng: number, address: string}>();
  @Output() cancel = new EventEmitter<void>();
}

class MockUrgentCaseService {
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
      relation: RelationType.Brother,
      government: 'القاهرة',
      city: 'مدينة نصر',
      street: 'الشارع الرئيسي',
      eventDate: '2023-10-10T00:00:00',
      description: 'Test',
      latitude: 30.0,
      longitude: 31.0,
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

describe('UrgentUpdate', () => {
  let component: UrgentUpdate;
  let fixture: ComponentFixture<UrgentUpdate>;
  let mockService: MockUrgentCaseService;
  let mockCache: MockCacheService;
  let mockRouter: any;
  let mockSnackbar: MockSnackbarService;

  beforeEach(async () => {
    mockService = new MockUrgentCaseService();
    mockCache = new MockCacheService();
    mockRouter = { navigate: vi.fn() };
    mockSnackbar = new MockSnackbarService();

    await TestBed.configureTestingModule({
      imports: [UrgentUpdate, ReactiveFormsModule],
      providers: [
        FormBuilder,
        { provide: UrgentCaseService, useValue: mockService },
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
      .overrideComponent(UrgentUpdate, {
        remove: { imports: [CaseMediaUploaderComponent] },
        add: { imports: [MockCaseMediaUploaderComponent] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(UrgentUpdate);
    component = fixture.componentInstance;
    fixture.detectChanges(); // triggers ngOnInit and loadCase
  });

  describe('1) Component Initialization', () => {
    it('should create UrgentUpdate successfully', () => {
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
      expect(v.fName).toBe('احمد');
      expect(v.age).toBe(25);
      expect(v.gender).toBe(Gender.Male);
      expect(component.existingPhotos().length).toBe(1);
      expect(component.selectedLat()).toBe(30.0);
      expect(component.selectedLng()).toBe(31.0);
    });
  });

  describe('2) Form Behavior', () => {
    it('required fields are enforced', () => {
      component.form.patchValue({
        fName: '', lName: '', age: null, gender: '', government: '', city: '', street: ''
      });
      expect(component.form.get('fName')?.invalid).toBe(true);
      expect(component.form.get('lName')?.invalid).toBe(true);
      expect(component.form.get('age')?.invalid).toBe(true);
      expect(component.form.get('government')?.invalid).toBe(true);
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
        fName: 'احمد', lName: 'محمد', age: 25, gender: Gender.Male
      });
      component.nextStep();
      expect(component.currentStep()).toBe(2);
    });
  });

  describe('4) Cache Draft Behavior', () => {
    it('should save draft after form value changes', async () => {
      component.form.patchValue({ age: 99 });
      await new Promise(resolve => setTimeout(resolve, 600)); // debounceTime 500ms
      const draft = mockCache.get(`UrgentUpdate_Draft_1`);
      expect(draft).toBeTruthy();
      expect(draft.formValue.age).toBe(99);
    });
  });

  describe('5) Submit Behavior', () => {
    beforeEach(() => {
      component.form.patchValue({
        fName: 'احمد', lName: 'محمد', age: 25, gender: Gender.Male,
        government: 'القاهرة', city: 'مدينة نصر', street: 'شارع النصر'
      });
      
      component.mediaPayload.set({
        primaryImage: null,
        additionalImages: [],
        video: null,
        deletedImageIds: [], // keep existing photo
        primaryPhotoId: 1
      });
      
      component.selectedLat.set(30.0);
      component.selectedLng.set(31.0);
    });

    it('should successfully submit and handle successful update', () => {
      component.onSubmit();
      
      expect(mockService.updateCaseArgs.length).toBe(1);
      
      const args = mockService.updateCaseArgs[0];
      expect(args.id).toBe(1);
      const req = args.request;
      expect(req.fName).toBe('احمد');
      expect(req.lName).toBe('محمد');
      expect(req.age).toBe(25);
      expect(req.latitude).toBe(30.0);
      expect(req.longitude).toBe(31.0);

      expect(mockCache.removeCalled).toBe(true);
      expect(component.isSubmitting()).toBe(false);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/urgent', 1]);
      expect(mockSnackbar.successArgs.length).toBe(1);
    });
  });

  describe('6) Error Handling Behavior', () => {
    beforeEach(() => {
      component.form.patchValue({
        fName: 'احمد', lName: 'محمد', age: 25, gender: Gender.Male,
        government: 'القاهرة', city: 'مدينة نصر', street: 'شارع النصر'
      });
      component.mediaPayload.set({
        primaryImage: null,
        additionalImages: [],
        video: null,
        deletedImageIds: [], // keep existing photo
        primaryPhotoId: 1
      });
      component.selectedLat.set(30.0);
      component.selectedLng.set(31.0);
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
