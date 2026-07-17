import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AiMatchingService, AiMatchedCase } from '../../services/ai-search.service';
import Swal from 'sweetalert2';
import { SnackbarService } from '../../../../core/services/toast.service';
import { CaseCardComponent } from '../../../../shared/components/cases-components/case-card/case-card.component';

@Component({
  selector: 'app-ai-search',
  standalone: true,
  imports: [CommonModule, CaseCardComponent],
  templateUrl: './ai-search.html',
  styleUrl: './ai-search.css',
})
export class AiSearch implements OnInit {
  private aiMatchingService = inject(AiMatchingService);
  private toast = inject(SnackbarService);
  
  isDragging = signal(false);
  isLoading = signal(false);
  results = signal<AiMatchedCase[]>([]);
  selectedImage = signal<File | null>(null);
  selectedImagePreview = signal<string | null>(null);

  ngOnInit(): void {
    // Restore state from service cache if available
    const cachedImage = this.aiMatchingService.cachedImageFile();
    const cachedPreview = this.aiMatchingService.cachedImagePreview();
    const cachedResults = this.aiMatchingService.cachedResults();

    if (cachedImage) {
      this.selectedImage.set(cachedImage);
      this.selectedImagePreview.set(cachedPreview);
      this.results.set(cachedResults);
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
    
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.handleFile(event.dataTransfer.files[0]);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
    }
  }

  handleFile(file: File) {
    const validExtensions = ['image/jpeg', 'image/jpg', 'image/png'];
    const maxSizeBytes = 5 * 1024 * 1024; // 5MB

    if (!validExtensions.includes(file.type)) {
      Swal.fire({
        icon: 'error',
        title: 'صيغة غير مدعومة',
        text: 'يرجى رفع صورة بصيغة JPG, JPEG أو PNG فقط.',
      });
      return;
    }

    if (file.size > maxSizeBytes) {
      Swal.fire({
        icon: 'error',
        title: 'حجم الصورة كبير',
        text: 'يجب ألا يتعدى حجم الصورة 5 ميجابايت.',
      });
      return;
    }
    this.selectedImage.set(file);
    this.aiMatchingService.cachedImageFile.set(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      const previewUrl = e.target?.result as string;
      this.selectedImagePreview.set(previewUrl);
      this.aiMatchingService.cachedImagePreview.set(previewUrl);
    };
    reader.readAsDataURL(file);
  }

  startSearch() {
    const file = this.selectedImage();
    if (!file) {
      Swal.fire({
        icon: 'warning',
        title: 'تنبيه',
        text: 'الرجاء اختيار صورة أولاً',
      });
      return;
    }

    this.isLoading.set(true);
    this.results.set([]);

    this.aiMatchingService.searchFace(file).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success && res.data) {
          this.results.set(res.data);
          this.aiMatchingService.cachedResults.set(res.data);
          if (res.data.length === 0) {
            Swal.fire({
              icon: 'info',
              title: 'لم يتم العثور على نتائج',
              text: 'لم يتم العثور على أي تطابق في قاعدة البيانات',
            });
          }
        } else {
          this.toast.error(res.message || 'حدث خطأ أثناء البحث');
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        const errorMessage = err.error?.detail || err.error?.title || err.error?.message || 'حدث خطأ في الاتصال بالخادم';
        this.toast.error(errorMessage);
      }
    });
  }
}
