// import { ChangeDetectionStrategy, Component, input } from '@angular/core';
// import { FormGroup, ReactiveFormsModule } from '@angular/forms';
// import { Gender } from '../../../enums/gender';
// import { FormField } from '../../form-field/form-field';


// @Component({
//   selector: 'app-case-person-data',
//   standalone: true,
//   imports: [ReactiveFormsModule, FormField],
//   templateUrl: './case-person-data.html',
//   changeDetection: ChangeDetectionStrategy.OnPush,
// })
// export class CasePersonDataComponent {
//   form = input.required<FormGroup>();
//   isInvalid = input.required<(field: string) => boolean>();
//   getError = input.required<(field: string) => string | null>();
//   showRelation = input<boolean>(true);
//   caseType = input<'urgent' | 'long' | 'unknown' | 'update'>();
//   isNameRequired = input<boolean>(true);

//   readonly genders = Gender;

//   readonly relationOptions = [
//     { value: 'Father', label: 'أب' },
//     { value: 'Mother', label: 'أم' },
//     { value: 'Brother', label: 'أخ' },
//     { value: 'Sister', label: 'أخت' },
//     { value: 'Husband', label: 'زوج' },
//     { value: 'Wife', label: 'زوجة' },
//     { value: 'Son', label: 'ابن' },
//     { value: 'Daughter', label: 'ابنة' },
//     { value: 'Uncle', label: 'عم / خال' },
//     { value: 'Aunt', label: 'عمة / خالة' },
//     { value: 'Other', label: 'أخرى' },
//   ];
// }
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Gender } from '../../../enums/gender';
import { FormField } from '../../form-field/form-field';
// 1. استيراد الـ Options الموحدة من الـ Dictionary
import { RELATION_TYPE_OPTIONS } from '../../../../core/constants/dictionaries/relation.type.dictionary';

@Component({
  selector: 'app-case-person-data',
  standalone: true,
  imports: [ReactiveFormsModule, FormField],
  templateUrl: './case-person-data.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CasePersonDataComponent {
  form = input.required<FormGroup>();
  isInvalid = input.required<(field: string) => boolean>();
  getError = input.required<(field: string) => string | null>();
  showRelation = input<boolean>(true);
  caseType = input<'urgent' | 'long' | 'unknown' | 'update'>();
  isNameRequired = input<boolean>(true);

  readonly genders = Gender;

  readonly relationOptions = RELATION_TYPE_OPTIONS;
}