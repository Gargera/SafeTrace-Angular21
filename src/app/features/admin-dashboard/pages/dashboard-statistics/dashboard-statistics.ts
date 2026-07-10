import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardDto } from '../../models/DashboardDto';
import { DashboardService } from '../../Services/dashboard.service';

interface ProblemDetails {
  status?: number;
  title?: string;
  detail?: string;
  instance?: string;
}

@Component({
  selector: 'app-dashboard-statistics',
  imports: [CommonModule],
  templateUrl: './dashboard-statistics.html',
  styleUrl: './dashboard-statistics.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardStatistics implements OnInit {
  private readonly dashboardService = inject(DashboardService);

  dashboard = signal<DashboardDto | null>(null);
  error = signal<ProblemDetails | null>(null);
  isLoading = signal(false);

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.isLoading.set(true);

    this.dashboardService.getDashboard().subscribe({
      next: (response) => {
        console.log('Dashboard data loaded:', response);
        this.dashboard.set(response.data);
        this.error.set(null);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(
          err?.error ?? {
            detail: 'حدث خطأ غير متوقع أثناء تحميل البيانات.',
          },
        );
        this.isLoading.set(false);
      },
    });
  }

  protected reload(): void {
    this.loadDashboard();
  }

  protected errorDetail(): string {
    return this.error()?.detail ?? 'حدث خطأ غير متوقع أثناء تحميل البيانات.';
  }
}
