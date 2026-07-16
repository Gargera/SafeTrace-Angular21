import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardDto } from '../../models/DashboardDto';
import { DashboardService } from '../../services/dashboard.service';

interface ProblemDetails {
  status?: number;
  title?: string;
  detail?: string;
  instance?: string;
}

interface DonutSegment {
  label: string;
  value: number;
  percent: number;
  color: string;
  dashArray: string;
  dashOffset: number;
}

interface CaseTypeBar {
  label: string;
  total: number;
  active: number;
  found: number;
  pending: number;
  rejected: number;
  expired: number;
  deleted: number;
  totalHeightPercent: number;
  activePercent: number;
  foundPercent: number;
  pendingPercent: number;
  rejectedPercent: number;
  expiredPercent: number;
  deletedPercent: number;
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

  private static readonly DONUT_RADIUS = 60;
  private static readonly DONUT_CIRCUMFERENCE = 2 * Math.PI * DashboardStatistics.DONUT_RADIUS;

  dashboard = signal<DashboardDto | null>(null);
  error = signal<ProblemDetails | null>(null);
  isLoading = signal(false);

  /** Donut: breakdown of all cases by current status */
  caseStatusDonut = computed<DonutSegment[]>(() => {
    const d = this.dashboard();
    if (!d) return [];
    return this.buildDonutSegments([
      ['نشطة', d.totalActiveCases, 'var(--color-error)'],
      ['تم العثور عليها', d.totalFoundedCases, 'var(--color-tertiary)'],
      ['قيد الانتظار', d.totalPendingCases, 'var(--color-secondary)'],
      ['مرفوضة', d.totalRejectedgCases, 'var(--color-outline)'],
      ['منتهية الصلاحية', d.totalExpiredCases, 'var(--color-primary)'],
      ['محذوفة', d.totalDeletedCases, 'var(--color-on-surface-variant)'],
    ]);
  });

  caseStatusTotal = computed(() => this.caseStatusDonut().reduce((sum, s) => sum + s.value, 0));

  /** Donut: breakdown of donations by transaction status */
  donationsDonut = computed<DonutSegment[]>(() => {
    const d = this.dashboard();
    if (!d) return [];
    return this.buildDonutSegments([
      ['ناجحة', d.totalCountSucceededDonations, 'var(--color-tertiary)'],
      ['قيد الانتظار', d.totalCountPendingDonations, 'var(--color-secondary)'],
      ['فاشلة', d.totalCountFailedDonations, 'var(--color-error)'],
    ]);
  });

  donationsCountTotal = computed(() => this.donationsDonut().reduce((sum, s) => sum + s.value, 0));

  formattedDonationsSum = computed(() => {
    const d = this.dashboard();
    if (!d) return '0';
    return new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 0 }).format(d.totalSumDonations);
  });

  /** Stacked bars: composition of each case type by status */
  caseTypeBars = computed<CaseTypeBar[]>(() => {
    const d = this.dashboard();
    if (!d || !d.caseTypes?.length) return [];
    const maxTotal = Math.max(...d.caseTypes.map((c) => c.total), 1);

    return d.caseTypes.map((c) => ({
      label: c.caseType,
      total: c.total,
      active: c.active,
      found: c.found,
      pending: c.pending,
      rejected: c.rejected,
      expired: c.expired,
      deleted: c.deleted,
      totalHeightPercent: (c.total / maxTotal) * 100,
      activePercent: c.total ? (c.active / c.total) * 100 : 0,
      foundPercent: c.total ? (c.found / c.total) * 100 : 0,
      pendingPercent: c.total ? (c.pending / c.total) * 100 : 0,
      rejectedPercent: c.total ? (c.rejected / c.total) * 100 : 0,
      expiredPercent: c.total ? (c.expired / c.total) * 100 : 0,
      deletedPercent: c.total ? (c.deleted / c.total) * 100 : 0,
    }));
  });

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.isLoading.set(true);

    this.dashboardService.getDashboard().subscribe({
      next: (response) => {
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

  /**
   * Converts a list of (label, value, color) tuples into SVG donut segments,
   * pre-computing stroke-dasharray / stroke-dashoffset so the template stays
   * free of chart math. Zero-value entries are dropped so the ring doesn't
   * render a phantom sliver.
   */
  private buildDonutSegments(entries: Array<[string, number, string]>): DonutSegment[] {
    const total = entries.reduce((sum, [, value]) => sum + value, 0);
    if (total <= 0) return [];

    const circumference = DashboardStatistics.DONUT_CIRCUMFERENCE;
    let cumulativePercent = 0;

    return entries
      .filter(([, value]) => value > 0)
      .map(([label, value, color]) => {
        const percent = (value / total) * 100;
        const dashLength = (percent / 100) * circumference;

        const segment: DonutSegment = {
          label,
          value,
          percent,
          color,
          dashArray: `${dashLength} ${circumference - dashLength}`,
          dashOffset: (-cumulativePercent / 100) * circumference,
        };

        cumulativePercent += percent;
        return segment;
      });
  }
}
