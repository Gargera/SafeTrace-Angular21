import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UnknownCreate } from './unknown-create';
import { UnknownCaseService } from '../../services/unknown-case.service';
import { CacheService } from '../../../../core/cache/cache.service';
import { SnackbarService } from '../../../../shared/services/toast.service';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Gender } from '../../../../shared/enums/gender';
import { DuplicateDecision } from '../../../../shared/enums/duplicate-decision';
import { CACHE_TAGS, CACHE_TTL } from '../../../../core/cache/cache.constants';

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

const validEventDate = () =>
  new Date(Date.now() - 24 * 60 * 60 * 1000) // past date
    .toISOString()
    .slice(0, 16);

describe('UnknownCreate', () => {
  let component: UnknownCreate;
  let fixture: ComponentFixture<UnknownCreate>;

  let mockService: any;
  let mockCache: any;
  let mockSnackbar: any;
  let mockRouter: any;

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

    await TestBed.configureTestingModule({
      imports: [UnknownCreate],
      providers: [
        { provide: UnknownCaseService, useValue: mockService },
        { provide: CacheService, useValue: mockCache },
        { provide: SnackbarService, useValue: mockSnackbar },
        { provide: Router, useValue: mockRouter },
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    mockCache.getResult = null;
    fixture = TestBed.createComponent(UnknownCreate);
    component = fixture.componentInstance;

    // Mock ViewChild mediaUploader as signal
    component.mediaUploader = (() => ({
      validateMedia: () => ({ valid: true, message: null }),
      validate: () => ({ valid: true, message: null })
    })) as any;

    fixture.detectChanges();
  });

  describe('1) Component Initialization', () => {
    it('should create UnknownCreate successfully', () => {
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
      expect(component.form.invalid).toBe(true);
    });

    it('required fields are enforced', () => {
      component.form.patchValue({
        fName: '', sName: '', age: null, gender: null, government: '', city: '', street: '', eventDate: ''
      });
      // Name fields are optional for Unknown, but if provided they are validated. Age and Gender are required.
      expect(component.form.get('age')?.invalid).toBe(true);
      expect(component.form.get('gender')?.invalid).toBe(true);
      expect(component.form.get('government')?.invalid).toBe(true);
      expect(component.form.get('city')?.invalid).toBe(true);
      expect(component.form.get('street')?.invalid).toBe(true);
      expect(component.form.get('eventDate')?.invalid).toBe(true);
    });

    it('valid data makes the form valid', () => {
      component.form.patchValue({
        age: 25,
        gender: Gender.Male,
        government: 'القاهرة',
        city: 'مدينة نصر',
        street: 'شارع النصر',
        eventDate: validEventDate()
      });
      expect(component.form.valid).toBe(true);
    });

    it('future dates must be rejected according to pastDate validator', () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
      component.form.patchValue({ eventDate: futureDate });
      expect(component.form.get('eventDate')?.invalid).toBe(true);
      expect(component.form.get('eventDate')?.errors?.['pastDate']).toBeTruthy();
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
      
      // But if provided they must be valid (Arabic)
      component.form.patchValue({ fName: 'John' });
      expect(component.form.get('fName')?.invalid).toBe(true);
    });
  });

  describe('3) Step Navigation Behavior', () => {
    describe('Step 1', () => {
      it('invalid data should keep the user on step 1', () => {
        component.currentStep.set(1);
        component.form.patchValue({ age: null }); // Invalid
        component.nextStep();
        expect(component.currentStep()).toBe(1);
      });

      it('valid data should move from step 1 -> step 2', () => {
        component.currentStep.set(1);
        component.form.patchValue({
          age: 25, gender: Gender.Male
        });
        component.nextStep();
        expect(component.currentStep()).toBe(2);
      });
    });

    describe('Step 2', () => {
      beforeEach(() => {
        component.currentStep.set(2);
        component.form.patchValue({
          government: 'القاهرة', city: 'مدينة نصر', street: 'شارع النصر', eventDate: validEventDate()
        });
      });

      it('valid location data should move from step 2 -> step 3', () => {
        component.nextStep();
        expect(component.currentStep()).toBe(3);
      });
    });
  });

  describe('4) Cache Draft Behavior', () => {
    it('should save draft after form value changes', async () => {
      component.form.patchValue({ age: 30 });
      await new Promise(resolve => setTimeout(resolve, 600));
      expect(mockCache.setCalled).toBe(true);
      const callArgs = mockCache.setArgs;
      expect(callArgs[0]).toBe('UnknownCreate_Draft');
      expect(callArgs[2]).toBe(CACHE_TTL.UI_STATE);
      expect(callArgs[3]).toEqual([CACHE_TAGS.UI_STATE]);
    });

    it('should restore existing draft from cache on init', () => {
      const file = new File([''], 'test.png');
      const mockDraft = {
        formValue: { age: 40 },
        currentStep: 2,
        showForceCreatePopup: true,
        showDuplicateInfoDialog: false,
        currentDuplicateDecision: null,
        isBlockedDuplicate: false,
        matchedCases: [],
        existingCaseType: null,
        newPrimaryImage: file,
        newAdditionalImages: [],
        newVideo: null
      };
      mockCache.getResult = mockDraft;

      const newFixture = TestBed.createComponent(UnknownCreate);
      const newComponent = newFixture.componentInstance;
      newFixture.detectChanges(); // triggers ngOnInit

      expect(newComponent.form.get('age')?.value).toBe(40);
      expect(newComponent.currentStep()).toBe(2);
      expect(newComponent.mediaPayload().primaryImage).toBe(file);
    });
  });

  describe('5) Media Upload Behavior', () => {
    it('onMediaChange updates mediaPayload', () => {
      const file = new File([''], 'test.png');
      component.onMediaChange({
        primaryImage: file,
        additionalImages: [],
        video: null,
        deletedImageIds: [],
        primaryPhotoId: null
      });
      expect(component.mediaPayload().primaryImage).toBe(file);
    });

    it('draft is saved after media changes', () => {
      mockCache.setCalled = false;
      component.onMediaChange({
        primaryImage: null,
        additionalImages: [],
        video: null,
        deletedImageIds: [],
        primaryPhotoId: null
      });
      expect(mockCache.setCalled).toBe(true);
    });
  });

  describe('6) Submit Behavior', () => {
    beforeEach(() => {
      component.form.patchValue({
        fName: 'احمد', sName: 'محمد', age: 25, gender: Gender.Male,
        government: 'القاهرة', city: 'مدينة نصر', street: 'شارع النصر', eventDate: validEventDate()
      });
      const file = new File([''], 'test.png');
      component.onMediaChange({
        primaryImage: file, additionalImages: [], video: null, deletedImageIds: [], primaryPhotoId: null
      });
    });

    it('should successfully submit and handle successful creation', () => {
      mockService.createCaseResult = of({ isSuccess: true, data: { isCreated: true } });
      component.onSubmit();

      expect(mockService.createCaseCalled).toBe(true);

      const req = mockService.createCaseArgs[0];
      expect(req.fName).toBe('احمد');
      expect(req.sName).toBe('محمد');
      expect(req.primaryImage).toBeTruthy();

      expect(mockCache.removeCalled).toBe(true);
      expect(mockSnackbar.successCalled).toBe(true);
      expect(mockRouter.navigateCalled).toBe(true);
      expect(mockRouter.navigateArgs[0]).toEqual('/unknown');
      expect(component.isSubmitting()).toBe(false);
    });
  });

  describe('7) Duplicate Case Behavior', () => {
    beforeEach(() => {
      component.form.patchValue({
        fName: 'احمد', sName: 'محمد', age: 25, gender: Gender.Male,
        government: 'القاهرة', city: 'مدينة نصر', street: 'شارع النصر', eventDate: validEventDate()
      });
      const file = new File([''], 'test.png');
      component.onMediaChange({
        primaryImage: file, additionalImages: [], video: null, deletedImageIds: [], primaryPhotoId: null
      });
    });

    const testDuplicateDecision = (decision: DuplicateDecision) => {
      mockService.createCaseResult = of({
        isSuccess: true,
        data: { isCreated: false, duplicateDecision: decision, matchedCases: [], isBlocked: false }
      });
      component.onSubmit();
    };

    it('SameUserDuplicate should show DuplicateInfoDialog', () => {
      testDuplicateDecision(DuplicateDecision.SameUserDuplicate);
      expect(component.showDuplicateInfoDialog()).toBe(true);
    });

    it('PendingOwnerCase should show DuplicateInfoDialog', () => {
      testDuplicateDecision(DuplicateDecision.PendingOwnerCase);
      expect(component.showDuplicateInfoDialog()).toBe(true);
    });

    it('PendingUnknownCase should show DuplicateInfoDialog', () => {
      testDuplicateDecision(DuplicateDecision.PendingUnknownCase);
      expect(component.showDuplicateInfoDialog()).toBe(true);
    });

    it('ActiveOwnerCase should show ForceCreatePopup', () => {
      testDuplicateDecision(DuplicateDecision.ActiveOwnerCase);
      expect(component.showForceCreatePopup()).toBe(true);
    });

    it('ActiveUnknownCase should show ForceCreatePopup', () => {
      testDuplicateDecision(DuplicateDecision.ActiveUnknownCase);
      expect(component.showForceCreatePopup()).toBe(true);
    });
  });

  describe('8) Force Create Behavior', () => {
    it('Cancel closes popup', () => {
      component.showForceCreatePopup.set(true);
      (component as any).pendingRequest.set({});
      component.onForceCreateCancel();
      expect(component.showForceCreatePopup()).toBe(false);
      expect((component as any).pendingRequest()).toBeNull();
    });

    it('Confirm calls onSubmit(true)', () => {
      let onSubmitCalled = false;
      let onSubmitArg = false;
      component.onSubmit = (force) => { onSubmitCalled = true; onSubmitArg = force as boolean; };

      component.isBlockedDuplicate.set(false);
      component.onForceCreateConfirm();
      expect(component.showForceCreatePopup()).toBe(false);
      expect(onSubmitCalled).toBe(true);
      expect(onSubmitArg).toBe(true);
    });

    it('Blocked duplicates cannot force create', () => {
      let onSubmitCalled = false;
      component.onSubmit = () => { onSubmitCalled = true; };

      component.isBlockedDuplicate.set(true);
      component.onForceCreateConfirm();
      expect(onSubmitCalled).toBe(false);
    });
  });

  describe('9) Error Handling Behavior', () => {
    it('API error sets error message, resets isSubmitting, clears pending request', () => {
      component.form.patchValue({
        fName: 'احمد', sName: 'محمد', age: 25, gender: Gender.Male,
        government: 'القاهرة', city: 'مدينة نصر', street: 'شارع النصر', eventDate: validEventDate()
      });
      const file = new File([''], 'test.png');
      component.onMediaChange({
        primaryImage: file, additionalImages: [], video: null, deletedImageIds: [], primaryPhotoId: null
      });

      mockService.createCaseResult = throwError(() => ({ status: 500, message: 'Server error' }));
      component.onSubmit();

      expect(component.isSubmitting()).toBe(false);
      expect((component as any).pendingRequest()).toBeNull();
      expect(component.errorMsg()).not.toBeNull();
    });

    it('Validation error correctly handled via 400 status', () => {
      component.form.patchValue({
        fName: 'احمد', sName: 'محمد', age: 25, gender: Gender.Male,
        government: 'القاهرة', city: 'مدينة نصر', street: 'شارع النصر', eventDate: validEventDate()
      });
      const file = new File([''], 'test.png');
      component.onMediaChange({
        primaryImage: file, additionalImages: [], video: null, deletedImageIds: [], primaryPhotoId: null
      });

      mockService.createCaseResult = throwError(() => ({
        status: 400,
        error: { errors: { PrimaryImage: ['الصورة غير صالحة'] } },
        message: 'يجب أن تكون لنفس الشخص'
      }));
      component.onSubmit();

      expect(component.isSubmitting()).toBe(false);
      expect(component.mediaErrors().primary).toBe('الصورة غير صالحة');
      expect(component.errorMsg()).toBe('الصورة غير صالحة');
    });
  });
});
