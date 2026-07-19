import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CaseHeaderComponent } from '../../../../shared/components/cases-components/case-header/case-header.component';
import { CardComponent } from '../../../../shared/components/card/card';
import { SnackbarService } from '../../../../core/services/toast.service';
import { ComplaintsService } from '../../services/complaints.service';
import { ComplaintStatisticsDto } from '../../models/ComplaintStatisticsDto';

@Component({
  selector: 'app-complaints-list',
  standalone: true,
  imports: [CommonModule, CaseHeaderComponent, CardComponent],
  templateUrl: './complaints-list.html',
  styleUrls: ['./complaints-list.css'],
})
export class ComplaintsList implements OnInit {
  private complaintsService = inject(ComplaintsService);
  private toast = inject(SnackbarService);

  statistics = signal<ComplaintStatisticsDto | null>(null);
  loadingStats = signal<boolean>(true);

  ngOnInit(): void {
    this.loadStatistics();
  }

  loadStatistics() {
    this.loadingStats.set(true);
    this.complaintsService.getStatistics().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.statistics.set(res.data);
        } else {
          this.toast.error(res.message || 'فشل تحميل الإحصائيات');
        }
        this.loadingStats.set(false);
      },
      error: () => {
        this.toast.error('تعذر الاتصال بالخادم لتحميل الإحصائيات');
        this.loadingStats.set(false);
      }
    });
  }
}
