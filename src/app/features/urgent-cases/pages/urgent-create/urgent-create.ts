import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { UrgentCaseService } from '../../services/urgent-case.service';
import { UrgentCaseCreateRequest } from '../../models/request/UrgentCaseCreateRequest';
import { Gender } from '../../../../shared/enums/gender';
import { RelationType } from '../../../../shared/enums/relation-type';
import { RELATION_TYPE_OPTIONS } from '../../../../core/constants/relation.type.dictionary';
import { EGYPT_GOVERNORATES } from '../../../../core/constants/governorates';
import { MapLocationPickerComponent } from '../../../../shared/components/map-location-picker/map-location-picker';
import { SnackbarService } from '../../../../core/services/toast.service';
import { ForceCreatePopupComponent } from '../../../../shared/components/cases-components/force-create-popup/force-create-popup.component';
import { MatchedCaseDto, mapMatchedCaseResponseToDto } from '../../../../shared/models/responses/matched-case.model';
import { GeocodingService } from '../../../../core/services/geocoding.service';
import { ButtonComponent } from '../../../../shared/components/button/button';
import { FormField } from '../../../../shared/components/form-field/form-field';

type Step = 1 | 2 | 3;

@Component({
  selector: 'app-urgent-create',
  standalone: true, 
  imports: [
    CommonModule,
    ReactiveFormsModule, 
    RouterLink, 
    MapLocationPickerComponent, 
    ForceCreatePopupComponent,
    ButtonComponent,
    FormField
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../../../../shared/styles/case-form.css', './urgent-create.css'],
  templateUrl: './urgent-create.html',
})
export class UrgentCreate {
  private fb = inject(FormBuilder);
  private service = inject(UrgentCaseService);
  private router = inject(Router);
  private snackbar = inject(SnackbarService);
  private geocoding = inject(GeocodingService);

  currentStep: Step = 1;
  isSubmitting = signal(false);
  errorMsg = signal<string | null>(null);

  selectedPhotos = signal<File[]>([]);
  photoPreviews = signal<string[]>([]);
  videoFile = signal<File | null>(null);

  selectedLat = signal<number | null>(null);
  selectedLng = signal<number | null>(null);
  selectedAddress = signal<string>('');

  isLocating = signal(false);
  locationError = signal<string | null>(null);

  showForceCreatePopup = signal(false);
  isBlockedDuplicate = signal(false);
  matchedCases = signal<MatchedCaseDto[]>([]);
  private pendingRequest: UrgentCaseCreateRequest | null = null;

  readonly genders = Gender;
  readonly relationOptions = RELATION_TYPE_OPTIONS;
  readonly governorates = EGYPT_GOVERNORATES;
  readonly today = new Date().toISOString().split('T')[0];

  readonly steps = [
    { num: 1, label: 'بيانات الشخص' },
    { num: 2, label: 'موقع الحادث' },
    { num: 3, label: 'صور' },
  ];

  get stepTitle(): string {
    return ['بيانات الشخص المفقود', 'موقع الحادث على الخريطة', 'صور'][this.currentStep - 1];
  }

  form = this.fb.group({
    fName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    sName: ['', [Validators.maxLength(100)]],
    tName: ['', [Validators.maxLength(100)]],
    lName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    age: [null as number | null, [Validators.required, Validators.min(0), Validators.max(150)]],
    gender: ['' as Gender | '', Validators.required],
    relation: [null as RelationType | null, Validators.required],
    communicationPhone: ['', [Validators.required, Validators.maxLength(20)]],
    description: ['', [Validators.maxLength(2000)]],
    government: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
    city: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
    street: ['', [Validators.required, Validators.maxLength(500)]],
    eventDate: ['', Validators.required],
  });

  isInvalid(field: string): boolean {
    const c = this.form.get(field);
    return !!(c?.invalid && c?.touched);
  }

  onLocationChange(loc: { lat: number; lng: number; address: string }): void {
    this.selectedLat.set(loc.lat);
    this.selectedLng.set(loc.lng);
    this.selectedAddress.set(loc.address);
  }

  useCurrentLocation(): void {
    if (!navigator.geolocation) {
      this.locationError.set('المتصفح لا يدعم تحديد الموقع الجغرافي.');
      return;
    }

    this.isLocating.set(true);
    this.locationError.set(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        this.geocoding.reverseGeocode(lat, lng).subscribe({
          next: (address) => {
            this.onLocationChange({ lat, lng, address });
            this.isLocating.set(false);
          },
          error: () => {
            this.onLocationChange({ lat, lng, address: `${lat.toFixed(4)}, ${lng.toFixed(4)}` });
            this.isLocating.set(false);
          },
        });
      },
      (error: GeolocationPositionError) => {
        this.isLocating.set(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            this.locationError.set('تم رفض إذن الوصول لموقعك. من فضلك فعّل صلاحية الموقع من إعدادات المتصفح.');
            break;
          case error.POSITION_UNAVAILABLE:
            this.locationError.set('تعذر تحديد موقعك الحالي.');
            break;
          case error.TIMEOUT:
            this.locationError.set('انتهت مهلة تحديد الموقع، حاول مرة أخرى.');
            break;
          default:
            this.locationError.set('حدث خطأ أثناء تحديد الموقع.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  nextStep(): void {
    const stepFields: Record<number, string[]> = {
      1: ['fName', 'lName', 'age', 'gender', 'relation', 'communicationPhone'],
      2: ['government', 'city', 'street', 'eventDate'],
    };
    const fields = stepFields[this.currentStep] ?? [];
    fields.forEach((f) => this.form.get(f)?.markAsTouched());
    if (fields.some((f) => this.form.get(f)?.invalid)) return;

    if (this.currentStep === 2) {
      if (this.selectedLat() === null || this.selectedLng() === null) {
        this.errorMsg.set('من فضلك حدد موقع الحادث على الخريطة.');
        return;
      }
    }

    this.currentStep = (this.currentStep + 1) as Step;
    this.errorMsg.set(null);
  }

  prevStep(): void {
    if (this.currentStep > 1) this.currentStep = (this.currentStep - 1) as Step;
  }

  onPrimaryPhotoSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    if (!file) return;
    this.selectedPhotos.update((p) => [file, ...p.filter((_, i) => i !== 0)].slice(0, 5));
    this.refreshPreviews();
  }

  onAdditionalPhotosSelected(event: Event): void {
    const files = Array.from((event.target as HTMLInputElement).files ?? []);
    this.selectedPhotos.update((p) => [...p, ...files].slice(0, 5));
    this.refreshPreviews();
  }

  private refreshPreviews(): void {
    this.photoPreviews.set(this.selectedPhotos().map((f) => URL.createObjectURL(f)));
  }

  removePhoto(index: number): void {
    this.selectedPhotos.update((p) => p.filter((_, i) => i !== index));
    this.photoPreviews.update((p) => p.filter((_, i) => i !== index));
  }

  onVideoSelected(event: Event): void {
    this.videoFile.set((event.target as HTMLInputElement).files?.[0] ?? null);
  }

  onSubmit(forceCreate = false): void {
    if (
      !forceCreate &&
      (this.form.invalid || this.selectedPhotos().length === 0 || this.selectedLat() === null)
    ) {
      this.form.markAllAsTouched();
      if (this.selectedPhotos().length === 0) {
        this.errorMsg.set('برجاء إضافة صورة واحدة على الأقل للشخص (الصورة الأساسية).');
      } else if (this.selectedLat() === null) {
        this.errorMsg.set('من فضلك حدد موقع الحادث على الخريطة.');
      }
      return;
    }

    this.isSubmitting.set(true);
    this.errorMsg.set(null);

    let request: UrgentCaseCreateRequest;
    if (forceCreate && this.pendingRequest) {
      request = this.pendingRequest;
    } else {
      const v = this.form.getRawValue();
      const photos = this.selectedPhotos();
      const [primaryImage, ...additionalImages] = photos;

      const formattedDate = v.eventDate ? new Date(v.eventDate).toISOString() : new Date().toISOString();

      request = {
        fName: v.fName!,
        lName: v.lName!,
        sName: v.sName || '',
        tName: v.tName || '',
        gender: v.gender as Gender,
        age: Number(v.age!),
        relation: Number(v.relation) as unknown as RelationType,
        communicationPhone: v.communicationPhone!,
        description: v.description || '',
        government: v.government!,
        city: v.city!,
        street: v.street!,
        eventDate: formattedDate,
        primaryImage,
        additionalImages: additionalImages.length ? additionalImages : [],
        video: this.videoFile(),
        latitude: Number(this.selectedLat()!),
        longitude: Number(this.selectedLng()!),
      };
      this.pendingRequest = request;
    }

    this.service.createCase(request, forceCreate).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        const data = res.data;

        // في حالة التكرار وعدم الإنشـاء
        if (data && (data.isCreated === false || data.isCreated === undefined)) {
          if (data.matchedCases) {
            this.matchedCases.set(data.matchedCases.map(mapMatchedCaseResponseToDto));
          } else {
            this.matchedCases.set([]);
          }

          // قراءة isSameTypeDuplicate بالصيغتين (PascalCase أو camelCase)
          const rawData = data as any;
          const isSameType = rawData.isSameTypeDuplicate ?? rawData.IsSameTypeDuplicate ?? false;

          this.isBlockedDuplicate.set(Boolean(isSameType));

          this.showForceCreatePopup.set(true);
          return;
        }

        this.showForceCreatePopup.set(false);
        this.snackbar.success('تم إرسال بلاغ الحالة بنجاح، هيتم مراجعته من الإدارة قريبًا.');
        this.router.navigate(['/urgent']);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const msg = err?.error?.message ?? 'حدث خطأ أثناء إرسال الطلب. حاول مرة أخرى.';
        this.errorMsg.set(msg);
        this.snackbar.error(msg);
      },
    });
  }

  onForceCreateCancel(): void {
    this.showForceCreatePopup.set(false);
  }

  onForceCreateConfirm(): void {
    // منع الـ Force Create لو كانت الحالة مكررة من نفس النوع
    if (this.isBlockedDuplicate()) {
      return;
    }
    this.showForceCreatePopup.set(false);
    this.onSubmit(true);
  }

  goBack(): void {
    this.router.navigate(['/urgent-cases']);
  }
}