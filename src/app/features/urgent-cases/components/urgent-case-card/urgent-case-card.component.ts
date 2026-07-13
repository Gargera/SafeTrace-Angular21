import { Component, Input, Output, EventEmitter } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { UrgentCaseListItemResponse } from '../../models/response/UrgentCaseListItemResponse';

@Component({
  selector: 'app-urgent-case-card',
  standalone: true,
  imports: [DatePipe, RouterModule],
  template: `
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow relative">
      <!-- Image & Badge -->
      <div class="relative h-56 w-full">
        <img [src]="caseItem.mainPhoto" [alt]="caseItem.fName || caseItem.caseCode" class="w-full h-full object-cover" />
        
        <!-- Timer Badge (Top Right) -->
        <div class="absolute top-3 right-3 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1 shadow-sm">
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span dir="ltr">23:57:55</span> <!-- Hardcoded for mockup, would be dynamic -->
        </div>

        <!-- Optional Bottom Left Badge (e.g. حالة عاجلة) -->
        @if (showUrgentTag) {
          <div class="absolute bottom-3 right-3 bg-white text-blue-600 text-xs font-bold px-3 py-1 rounded-full shadow-sm">
            حالة عاجلة
          </div>
        }
      </div>

      <!-- Content -->
      <div class="p-4">
        <h3 class="text-xl font-bold text-gray-900 mb-4">{{ caseItem.fName || caseItem.caseCode }}</h3>
        
        <div class="space-y-2 mb-6">
          <div class="flex justify-between items-center text-sm">
            <span class="text-gray-500">العمر:</span>
            <span class="font-medium text-gray-900">{{ caseItem.age }} سنة</span>
          </div>
          <div class="flex justify-between items-center text-sm">
            <span class="text-gray-500">الفئة:</span>
            <span class="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium">{{ getAgeCategory(caseItem.age) }}</span>
          </div>
          <div class="flex justify-between items-center text-sm">
            <span class="text-gray-500">تاريخ الفقد:</span>
            <span class="font-medium text-red-600">{{ caseItem.createdAt | date:'dd MMMM yyyy':'':'ar' }}</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="space-y-2">
          <button 
            [routerLink]="['/urgent-cases', caseItem.id]"
            class="w-full flex items-center justify-center gap-2 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50 transition-colors">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            عرض التفاصيل
          </button>
          
          <button 
            (click)="onContact.emit(caseItem.id)"
            class="w-full flex items-center justify-center gap-2 py-2 bg-blue-50 text-gray-800 rounded-md hover:bg-blue-100 transition-colors">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            تواصل مع المُبلّغ
          </button>
        </div>
      </div>
    </div>
  `
})
export class UrgentCaseCardComponent {
  @Input({ required: true }) caseItem!: UrgentCaseListItemResponse;
  @Input() showUrgentTag: boolean = false;
  @Output() onContact = new EventEmitter<number>();

  getAgeCategory(age: number): string {
    if (age <= 12) return 'طفل';
    if (age <= 24) return 'شاب';
    if (age <= 60) return 'بالغ';
    return 'مسن';
  }
}
