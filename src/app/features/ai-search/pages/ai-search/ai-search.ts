import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AiMatchingService, AiMatchedCase } from '../../services/ai-search.service';

import { SnackbarService } from '../../../../shared/services/toast.service';
import { CaseCardComponent } from '../../../../shared/components/cases-components/case-card/case-card.component';
import { CaseCardSkeletonComponent } from '../../../../shared/components/skeletons/case-card-skeleton/case-card-skeleton.component';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { AuthService } from '../../../../core/services/auth.service';
import { Router } from '@angular/router';
import { Permissions } from '../../../../core/constants/Permissions';

import { ImageService } from '../../../../shared/services/image.service';

import { ButtonComponent } from '../../../../shared/components/button/button';

@Component({
  selector: 'app-ai-search',
  standalone: true,
  imports: [CommonModule, CaseCardComponent, CaseCardSkeletonComponent, HeaderComponent, ButtonComponent],
  templateUrl: './ai-search.html',
  styleUrl: './ai-search.css',
})
export class AiSearch implements OnInit {
  private aiMatchingService = inject(AiMatchingService);
  private imageService = inject(ImageService);
  private toast = inject(SnackbarService);
  private authService = inject(AuthService);
  private router = inject(Router);
  
  isDragging = signal(false);
  isLoading = signal(false);
  results = signal<AiMatchedCase[]>([]);
  selectedImage = signal<File | null>(null);
  selectedImagePreview = signal<string | null>(null);

  ngOnInit(): void {
    // Restore state from service cache if available
    const cache = this.aiMatchingService.getCache();

    if (cache && cache.imageFile) {
      this.selectedImage.set(cache.imageFile);
      this.selectedImagePreview.set(cache.imagePreview);
      this.results.set(cache.results);
    }
  }

  private syncCache() {
    this.aiMatchingService.saveCache({
      results: this.results(),
      imagePreview: this.selectedImagePreview(),
      imageFile: this.selectedImage()
    });
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
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/auth/login'], { queryParams: { returnUrl: '/aisearch' } });
      return;
    }

    const validation = this.imageService.validate(file, 5);
    if (!validation.valid) {
      this.toast.error(validation.errorMessage ?? 'صيغة غير مدعومة.');
      return;
    }

    this.selectedImage.set(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      const previewUrl = e.target?.result as string;
      this.selectedImagePreview.set(previewUrl);
      this.syncCache();
    };
    reader.readAsDataURL(file);
  }

  startSearch() {
    const file = this.selectedImage();
    if (!file) {
      this.toast.warning('الرجاء اختيار صورة أولاً');
      return;
    }

    if (!this.authService.hasPermission(Permissions.AiMatching.Search)) {
      this.toast.warning('ليس لديك الصلاحيات الكافية لتنفيذ هذا الإجراء.');
      return;
    }

    this.isLoading.set(true);
    this.results.set([]);

    this.aiMatchingService.searchFace(file).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success && res.data) {
          this.results.set(res.data);
          this.syncCache();
          if (res.data.length === 0) {
            this.toast.info('لم يتم العثور على أي تطابق في قاعدة البيانات');
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
