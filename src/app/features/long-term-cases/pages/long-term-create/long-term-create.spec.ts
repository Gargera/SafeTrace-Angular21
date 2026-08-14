import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { LongTermCreate } from './long-term-create';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { LongTermCaseService } from '../../services/long-term-case.service';
import { CacheService } from '../../../../core/cache/cache.service';
import { SnackbarService } from '../../../../shared/services/toast.service';
import { ImageService } from '../../../../shared/services/image.service';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Gender } from '../../../../shared/enums/gender';
import { RelationType } from '../../../../shared/enums/relation-type';
import { DuplicateDecision } from '../../../../shared/enums/duplicate-decision';
import { CaseMediaUploaderComponent } from '../../../../shared/components/cases-components/case-media-uploader/case-media-uploader';

@Component({
  selector: 'app-case-media-uploader',
  standalone: true,
  template: '<div></div>',
})
class MockCaseMediaUploaderComponent {
  @Input() mode: 'create' | 'update' = 'create';
  @Input() initialPrimaryFile: File | null = null;
  @Input() initialAdditionalFiles: File[] = [];
  @Input() initialVideoFile: File | null = null;
  @Input() errors: any = {};
  @Output() mediaChange = new EventEmitter<any>();
}

class MockLongTermCaseService {
  createCaseArgs: any[] = [];
  createCaseResponse: any = of({
    status: 200,
    isSuccess: true,
    data: { isCreated: true, caseId: 101 },
  });
  createCase(request: any, forceCreate: boolean = false) {
    this.createCaseArgs.push({ request, forceCreate });
    return this.createCaseResponse;
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

describe('LongTermCreate', () => {
  let component: LongTermCreate;
  let fixture: ComponentFixture<LongTermCreate>;
  let mockService: MockLongTermCaseService;
  let mockCache: MockCacheService;
  let mockRouter: any;
  let mockSnackbar: MockSnackbarService;

  beforeEach(async () => {
    mockService = new MockLongTermCaseService();
    mockCache = new MockCacheService();
    mockRouter = { navigate: vi.fn() };
    mockSnackbar = new MockSnackbarService();

    await TestBed.configureTestingModule({
      imports: [LongTermCreate, ReactiveFormsModule],
      providers: [
        FormBuilder,
        { provide: LongTermCaseService, useValue: mockService },
        { provide: CacheService, useValue: mockCache },
        { provide: Router, useValue: mockRouter },
        { provide: SnackbarService, useValue: mockSnackbar },
        { provide: ImageService, useClass: MockImageService }
      ],
    })
      .overrideComponent(LongTermCreate, {
        remove: { imports: [CaseMediaUploaderComponent] },
        add: { imports: [MockCaseMediaUploaderComponent] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(LongTermCreate);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('1) Component Initialization', () => {
    it('should create LongTermCreate successfully', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize signals correctly', () => {
      expect(component.currentStep()).toBe(1);
      expect(component.isSubmitting()).toBe(false);
      expect(component.errorMsg()).toBeNull();
    });
  });

  describe('2) Form Behavior', () => {
    it('empty form is invalid', () => {
      expect(component.form.valid).toBe(false);
    });

    it('required fields are enforced', () => {
      component.form.patchValue({
        fName: '', lName: '', age: null, gender: '', relation: null, government: '', city: '', street: '', eventDate: ''
      });
      expect(component.form.get('fName')?.invalid).toBe(true);
      expect(component.form.get('age')?.invalid).toBe(true);
      expect(component.form.get('eventDate')?.invalid).toBe(true);
    });
  });

  describe('3) Navigation (Steps)', () => {
    it('invalid data should keep the user on step 1', () => {
      component.nextStep();
      expect(component.currentStep()).toBe(1);
    });

    it('valid data should move from step 1 -> step 2', () => {
      component.form.patchValue({
        fName: 'احمد', lName: 'محمد', age: 25, gender: Gender.Male, relation: RelationType.Brother
      });
      component.nextStep();
      expect(component.currentStep()).toBe(2);
    });
  });

  describe('4) Cache Draft Behavior', () => {
    it('should save draft after form value changes', async () => {
      component.form.patchValue({ age: 99 });
      await new Promise(resolve => setTimeout(resolve, 600)); // debounceTime 500ms
      const draft = mockCache.get('LongTermCreate_Draft');
      expect(draft).toBeTruthy();
      expect(draft.formValue.age).toBe(99);
    });
  });

  describe('5) Submission & Duplicate Flow', () => {
    beforeEach(() => {
      component.form.patchValue({
        fName: 'احمد', lName: 'محمد', age: 25, gender: Gender.Male, relation: RelationType.Brother,
        government: 'القاهرة', city: 'مدينة نصر', street: 'شارع النصر', eventDate: '2023-10-10'
      });
      
      const file = new File([''], 'test.png', { type: 'image/png' });
      component.mediaPayload.set({
        primaryImage: file,
        additionalImages: [],
        video: null,
        deletedImageIds: [],
        primaryPhotoId: null
      });
    });

    it('should show error if police report is missing', () => {
      component.onSubmit();
      expect(component.mediaErrors().policeReport).toContain('إرفاق محضر الشرطة');
      expect(component.errorMsg()).toBeTruthy();
    });

    it('should submit successfully when all valid', () => {
      component.policeReport.set(new File([''], 'police.jpg', { type: 'image/jpeg' }));
      component.onSubmit();
      
      expect(mockService.createCaseArgs.length).toBe(1);
      expect(mockCache.removeCalled).toBe(true);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/long-term']);
    });

    it('handles duplicate response by setting signals', () => {
      component.policeReport.set(new File([''], 'police.jpg', { type: 'image/jpeg' }));
      mockService.createCaseResponse = of({
        status: 200,
        isSuccess: true,
        data: {
          isCreated: false,
          isBlocked: false,
          duplicateDecision: DuplicateDecision.ActiveOwnerCase,
          matchedCases: [{ id: 5 }]
        },
      });

      component.onSubmit();
      
      expect(component.currentDuplicateDecision()).toBe(DuplicateDecision.ActiveOwnerCase);
      expect(component.showForceCreatePopup()).toBe(true);
      expect(component.matchedCases()[0].id).toBe(5);
      expect(mockCache.removeCalled).toBe(false);
    });
  });

  describe('6) Error Handling', () => {
    beforeEach(() => {
      component.form.patchValue({
        fName: 'احمد', lName: 'محمد', age: 25, gender: Gender.Male, relation: RelationType.Brother,
        government: 'القاهرة', city: 'مدينة نصر', street: 'شارع النصر', eventDate: '2023-10-10'
      });
      component.mediaPayload.set({
        primaryImage: new File([''], 'test.png', { type: 'image/png' }),
        additionalImages: [], video: null, deletedImageIds: [], primaryPhotoId: null
      });
      component.policeReport.set(new File([''], 'police.jpg', { type: 'image/jpeg' }));
    });

    it('handles API errors', () => {
      mockService.createCaseResponse = throwError(() => ({ error: { message: 'Server error' } }));
      component.onSubmit();
      expect(component.errorMsg()).toContain('Server error');
    });

    it('handles validation 400 errors for media', () => {
      mockService.createCaseResponse = throwError(() => ({
        status: 400,
        error: { errors: { 'PrimaryImage': ['الصورة غير صالحة'], 'PoliceReportImage': ['محضر مزيف'] } }
      }));
      component.onSubmit();
      expect(component.mediaErrors().primary).toContain('الصورة غير صالحة');
      expect(component.mediaErrors().policeReport).toContain('محضر مزيف');
    });
  });
});
