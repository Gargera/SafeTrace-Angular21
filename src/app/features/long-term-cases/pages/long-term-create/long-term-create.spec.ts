import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LongTermCreate, LONG_TERM_CREATE_DRAFT_KEY } from './long-term-create';
import { LongTermCaseService } from '../../services/long-term-case.service';
import { CacheService } from '../../../../core/cache/cache.service';
import { SnackbarService } from '../../../../shared/services/toast.service';
import { GeocodingService } from '../../../../core/services/geocoding/geocoding.service';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Gender } from '../../../../shared/enums/gender';
import { RelationType } from '../../../../shared/enums/relation-type';
import { DuplicateDecision } from '../../../../shared/enums/duplicate-decision';

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

describe('LongTermCreate', () => {
  let component: LongTermCreate;
  let fixture: ComponentFixture<LongTermCreate>;

  let mockService: any;
  let mockCache: any;
  let mockSnackbar: any;
  let mockRouter: any;
  let mockGeocoding: any;

  beforeEach(async () => {
    mockService = {
      createCaseResult: of({ isSuccess: true, data: { isCreated: true } }),
      createCaseCalled: false,
      createCaseArgs: [] as any[],
      createCase: function (req: any, force: any) {
        mockService.createCaseCalled = true;
        mockService.createCaseArgs = [req, force];
        return mockService.createCaseResult;
      }
    };

    mockCache = {
      getResult: null,
      get: function () { return mockCache.getResult; },
      setCalled: false,
      setArgs: [] as any[],
      set: function (...args: any[]) { mockCache.setCalled = true; mockCache.setArgs = args; },
      removeCalled: false,
      removeArgs: [] as any[],
      remove: function (...args: any[]) { mockCache.removeCalled = true; mockCache.removeArgs = args; }
    };

    mockSnackbar = {
      successCalled: false,
      errorCalled: false,
      success: function () { mockSnackbar.successCalled = true; },
      error: function () { mockSnackbar.errorCalled = true; }
    };

    mockRouter = {
      navigateCalled: false,
      navigateArgs: [] as any[],
      navigate: function (args: any[]) { mockRouter.navigateCalled = true; mockRouter.navigateArgs = args; }
    };

    mockGeocoding = {
      reverseGeocodeResult: of('Mock Address'),
      reverseGeocodeCalled: false,
      reverseGeocode: function () { mockGeocoding.reverseGeocodeCalled = true; return mockGeocoding.reverseGeocodeResult; }
    };

    await TestBed.configureTestingModule({
      imports: [LongTermCreate],
      providers: [
        { provide: LongTermCaseService, useValue: mockService },
        { provide: CacheService, useValue: mockCache },
        { provide: SnackbarService, useValue: mockSnackbar },
        { provide: Router, useValue: mockRouter },
        { provide: GeocodingService, useValue: mockGeocoding },
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    mockCache.getResult = null;
    fixture = TestBed.createComponent(LongTermCreate);
    component = fixture.componentInstance;

    // Mock ViewChild mediaUploader as signal
    component.mediaUploader = (() => ({
      validateMedia: () => ({ valid: true, message: null }),
      validate: () => ({ valid: true, message: null })
    })) as any;

    fixture.detectChanges();
  });

  const fillPersonData = () => {
    component.form.patchValue({
      fName: 'احمد', lName: 'محمد', age: 25, gender: Gender.Male, relation: RelationType.Father
    });
  };

  const fillLocationForm = () => {
    component.form.patchValue({
      government: 'القاهرة', city: 'مدينة نصر', street: 'شارع النصر', eventDate: '2023-10-10'
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
    });

    it('should return correct step header', () => {
      expect(component.stepHeader()?.title).toBe('بيانات الشخص المفقود');
    });
  });

  // 2) Form Validation
  describe('2) Form Validation', () => {
    it('should require mandatory fields', () => {
      component.form.patchValue({
        fName: '', lName: '', age: null, gender: null, relation: null, government: ''
      });
      expect(component.form.get('fName')?.invalid).toBe(true);
      expect(component.form.get('age')?.invalid).toBe(true);
    });

    it('should reject non arabic names', () => {
      component.form.patchValue({ fName: 'Ahmed' });
      expect(component.form.get('fName')?.invalid).toBe(true);
    });
  });

  // 3) Step Navigation
  describe('3) Step Navigation', () => {
    it('should not move when step 1 invalid', () => {
      component.currentStep.set(1);
      component.nextStep();
      expect(component.currentStep()).toBe(1);
    });

    it('should move step 1 to step 2', () => {
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
      expect(mockCache.setCalled).toBe(true);
      expect(mockCache.setArgs[0]).toBe(LONG_TERM_CREATE_DRAFT_KEY);
    });

    it('should restore existing draft from cache', () => {
      const file = new File([''], 'test.png');
      mockCache.getResult = {
        formValue: { fName: 'سالم', age: 40 },
        currentStep: 2,
        showForceCreatePopup: true,
        showDuplicateInfoDialog: false,
        currentDuplicateDecision: null,
        isBlockedDuplicate: false,
        matchedCases: [],
        existingCaseType: null,
        newPrimaryImage: file,
        newAdditionalImages: [],
        newVideo: null,
        policeReportFile: null
      };

      const newFixture = TestBed.createComponent(LongTermCreate);
      const newComponent = newFixture.componentInstance;
      newFixture.detectChanges();

      expect(newComponent.form.get('fName')?.value).toBe('سالم');
      expect(newComponent.currentStep()).toBe(2);
      expect(newComponent.mediaPayload().primaryImage).toBe(file);
      expect(newComponent.showForceCreatePopup()).toBe(true);
    });
  });

  // 5) Media Handling
  describe('5) Media Handling', () => {
    it('should update media payload', () => {
      const file = new File([''], 'test.png');
      component.onMediaChange({
        primaryImage: file, additionalImages: [], video: null, deletedImageIds: [], primaryPhotoId: null
      });
      expect(component.mediaPayload().primaryImage).toBe(file);
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
        primaryImage: file, additionalImages: [], video: null, deletedImageIds: [], primaryPhotoId: null
      });

      const request = (component as any).buildCreateRequest();

      expect(request.fName).toBe('احمد');
      expect(request.primaryImage).toBe(file);
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
      component.policeReport.set(new File([''], 'report.pdf'));
    });

    it('should submit successfully', () => {
      mockService.createCaseResult = of({ isSuccess: true, data: { isCreated: true } });
      component.onSubmit();

      expect(mockService.createCaseCalled).toBe(true);
      expect(mockCache.removeCalled).toBe(true);
      expect(mockSnackbar.successCalled).toBe(true);
      expect(mockRouter.navigateCalled).toBe(true);
      expect(mockRouter.navigateArgs[0]).toEqual('/long-term');
    });
  });

  // 9) Duplicate Handling
  describe('9) Duplicate Handling', () => {
    beforeEach(() => {
      fillPersonData();
      fillLocationForm();
      component.onMediaChange({
        primaryImage: new File([''], 'test.png'), additionalImages: [], video: null, deletedImageIds: [], primaryPhotoId: null
      });
      component.policeReport.set(new File([''], 'report.pdf'));
    });

    const testDuplicate = (decision: DuplicateDecision) => {
      mockService.createCaseResult = of({
        isSuccess: true,
        data: { isCreated: false, duplicateDecision: decision, isBlocked: false, matchedCases: [] }
      });
      component.onSubmit();
    };

    it('SameUserDuplicate should show DuplicateInfoDialog', () => {
      testDuplicate(DuplicateDecision.SameUserDuplicate);
      expect(component.showDuplicateInfoDialog()).toBe(true);
    });

    it('PendingOwnerCase should show DuplicateInfoDialog', () => {
      testDuplicate(DuplicateDecision.PendingOwnerCase);
      expect(component.showDuplicateInfoDialog()).toBe(true);
    });

    it('PendingUnknownCase should show DuplicateInfoDialog', () => {
      testDuplicate(DuplicateDecision.PendingUnknownCase);
      expect(component.showDuplicateInfoDialog()).toBe(true);
    });

    it('ActiveOwnerCase should show ForceCreatePopup', () => {
      testDuplicate(DuplicateDecision.ActiveOwnerCase);
      expect(component.showForceCreatePopup()).toBe(true);
    });

    it('ActiveUnknownCase should show ForceCreatePopup', () => {
      testDuplicate(DuplicateDecision.ActiveUnknownCase);
      expect(component.showForceCreatePopup()).toBe(true);
    });
  });

  // 10) Force Create Flow
  describe('10) Force Create Flow', () => {
    it('Cancel closes popup', () => {
      component.showForceCreatePopup.set(true);
      component.onForceCreateCancel();
      expect(component.showForceCreatePopup()).toBe(false);
      expect((component as any).pendingRequest()).toBeNull();
    });

    it('Confirm calls onSubmit(true)', () => {
      let onSubmitCalled = false;
      component.onSubmit = (force) => { onSubmitCalled = true; };

      component.isBlockedDuplicate.set(false);
      component.onForceCreateConfirm();
      expect(component.showForceCreatePopup()).toBe(false);
      expect(onSubmitCalled).toBe(true);
    });

    it('Blocked duplicates cannot force create', () => {
      let onSubmitCalled = false;
      component.onSubmit = () => { onSubmitCalled = true; };

      component.isBlockedDuplicate.set(true);
      component.onForceCreateConfirm();
      expect(onSubmitCalled).toBe(false);
    });
  });

  // 11) Error Handling
  describe('11) Error Handling', () => {
    beforeEach(() => {
      fillPersonData();
      fillLocationForm();
      component.onMediaChange({
        primaryImage: new File([''], 'test.png'), additionalImages: [], video: null, deletedImageIds: [], primaryPhotoId: null
      });
      component.policeReport.set(new File([''], 'report.pdf'));
    });

    it('Server Error 500 sets errorMsg', () => {
      mockService.createCaseResult = throwError(() => ({ status: 500, message: 'Server error' }));
      component.onSubmit();
      expect(component.errorMsg()).not.toBeNull();
      expect(component.isSubmitting()).toBe(false);
    });

    it('Network Error (status 0) sets network error message', () => {
      mockService.createCaseResult = throwError(() => ({ status: 0, message: '0 Unknown Error', name: 'HttpErrorResponse' }));
      component.onSubmit();
      expect(component.errorMsg()).toContain('تعذر الاتصال بالإنترنت');
    });

    it('Validation Error 400 sets media errors', () => {
      mockService.createCaseResult = throwError(() => ({
        status: 400,
        error: { errors: { PrimaryImage: ['Invalid format'] } }
      }));
      component.onSubmit();
      expect(component.errorMsg()).toContain('Invalid format');
      expect(component.mediaErrors().primary).toBe('Invalid format');
    });
  });

  // 12) Refactor Safety Tests
  describe('12) Refactor Safety Tests', () => {
    it('getSubmissionDependencies returns exact flow config', () => {
      const deps = (component as any).getSubmissionDependencies();
      expect(deps.successRoute).toEqual(['/long-term']);
      expect(deps.successMessage).toBeTruthy();
      expect(deps.draftKey).toBe(LONG_TERM_CREATE_DRAFT_KEY);
      expect(deps.isSubmitting).toBe(component.isSubmitting);
    });

    it('handleDuplicate modifies exact signals', () => {
      (component as any).handleDuplicate({
        duplicateDecision: DuplicateDecision.ActiveOwnerCase,
        isBlocked: true,
        matchedCases: [{ id: 1 }],
        existingCaseType: null
      });

      expect(component.currentDuplicateDecision()).toBe(DuplicateDecision.ActiveOwnerCase);
      expect(component.isBlockedDuplicate()).toBe(true);
      expect(component.matchedCases().length).toBe(1);
      expect(component.showForceCreatePopup()).toBe(true); // ActiveOwnerCase triggers force create popup
    });
  });
});
