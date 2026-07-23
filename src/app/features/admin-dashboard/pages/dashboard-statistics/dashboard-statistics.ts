import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardDto } from '../../models/Dashboard/DashboardDto';
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

interface StatCard {
  icon: string;
  label: string;
  value: number;
  color: string;
  bg: string;
  pulse?: boolean;
}

/**
 * Fixed semantic palette: every case/transaction status keeps the SAME color
 * everywhere it appears (stat card, donut, stacked bar, table badge) so the
 * eye learns "red = active/urgent" once and reuses it across the dashboard.
 */
const STATUS_COLORS = {
  active: '#EF4444', // coral-red — urgent, needs attention now
  found: '#10B981', // emerald — resolved, hopeful outcome
  pending: '#F59E0B', // amber — waiting on a decision
  rejected: '#94A3B8', // slate — closed, no action needed
  expired: '#8B5CF6', // violet — closed by time, distinct from rejected
  deleted: '#64748B', // cool gray — removed from the system
  succeeded: '#10B981',
  failed: '#EF4444',
  solved: '#10B981',
  unsolved: '#EF4444',
  users: '#6366F1', // indigo — platform/people
  cases: '#3B82F6', // blue — core entity
  aiSearch: '#06B6D4', // cyan — technology/AI
} as const;

@Component({
  selector: 'app-dashboard-statistics',
  imports: [CommonModule],
  templateUrl: './dashboard-statistics.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardStatistics implements OnInit {
  private readonly dashboardService = inject(DashboardService);

  private static readonly DONUT_RADIUS = 60;
  private static readonly DONUT_CIRCUMFERENCE = 2 * Math.PI * DashboardStatistics.DONUT_RADIUS;

  readonly statusColors = STATUS_COLORS;

  dashboard = signal<DashboardDto | null>(null);
  error = signal<ProblemDetails | null>(null);
  isLoading = signal(false);

  /** Top stat cards — data-driven so color/icon/label live in one place */
  statCards = computed<StatCard[]>(() => {
    const d = this.dashboard();
    if (!d) return [];
    const c = STATUS_COLORS;
    return [
      {
        icon: 'group',
        label: 'إجمالي المستخدمين',
        value: d.totalUsers,
        color: c.users,
        bg: 'rgba(99,102,241,0.12)',
      },
      {
        icon: 'folder_shared',
        label: 'إجمالي الحالات',
        value: d.totalCases,
        color: c.cases,
        bg: 'rgba(59,130,246,0.12)',
      },
      {
        icon: 'psychology',
        label: 'عمليات بحث الذكاء الاصطناعي اليوم',
        value: d.totalDailyAISearch,
        color: c.aiSearch,
        bg: 'rgba(6,182,212,0.12)',
      },
      {
        icon: 'verified',
        label: 'تم العثور عليها',
        value: d.totalFoundedCases,
        color: c.found,
        bg: 'rgba(16,185,129,0.12)',
      },
      {
        icon: 'emergency',
        label: 'الحالات النشطة',
        value: d.totalActiveCases,
        color: c.active,
        bg: 'rgba(239,68,68,0.12)',
        pulse: true,
      },
      {
        icon: 'pending_actions',
        label: 'قيد الانتظار',
        value: d.totalPendingCases,
        color: c.pending,
        bg: 'rgba(245,158,11,0.12)',
      },
      {
        icon: 'block',
        label: 'مرفوضة',
        value: d.totalRejectedCases,
        color: c.rejected,
        bg: 'rgba(148,163,184,0.12)',
      },
      {
        icon: 'hourglass_disabled',
        label: 'منتهية الصلاحية',
        value: d.totalExpiredCases,
        color: c.expired,
        bg: 'rgba(139,92,246,0.12)',
      },
      {
        icon: 'delete',
        label: 'المحذوفة',
        value: d.totalDeletedCases,
        color: c.deleted,
        bg: 'rgba(100,116,139,0.12)',
      },
    ];
  });

  /** Donut: breakdown of all cases by current status */
  caseStatusDonut = computed<DonutSegment[]>(() => {
    const d = this.dashboard();
    if (!d) return [];
    const c = STATUS_COLORS;
    return this.buildDonutSegments([
      ['نشطة', d.totalActiveCases, c.active],
      ['تم العثور عليها', d.totalFoundedCases, c.found],
      ['قيد الانتظار', d.totalPendingCases, c.pending],
      ['مرفوضة', d.totalRejectedCases, c.rejected],
      ['منتهية الصلاحية', d.totalExpiredCases, c.expired],
      ['محذوفة', d.totalDeletedCases, c.deleted],
    ]);
  });

  caseStatusTotal = computed(() => this.caseStatusDonut().reduce((sum, s) => sum + s.value, 0));

  /** Donut: breakdown of donations by transaction status */
  donationsDonut = computed<DonutSegment[]>(() => {
    const d = this.dashboard();
    if (!d) return [];
    const c = STATUS_COLORS;
    return this.buildDonutSegments([
      ['ناجحة', d.totalCountSucceededDonations, c.succeeded],
      ['قيد الانتظار', d.totalCountPendingDonations, c.pending],
      ['فاشلة', d.totalCountFailedDonations, c.failed],
    ]);
  });

  donationsCountTotal = computed(() => this.donationsDonut().reduce((sum, s) => sum + s.value, 0));

  /** Donut: complaints by resolution status */
  complaintsDonut = computed<DonutSegment[]>(() => {
    const d = this.dashboard();
    if (!d) return [];
    const c = STATUS_COLORS;
    return this.buildDonutSegments([
      ['تم حلها', d.totalSolvedComplaints, c.solved],
      ['لم يتم حلها', d.totalUnSolvedComplaints, c.unsolved],
    ]);
  });

  complaintsCountTotal = computed(() =>
    this.complaintsDonut().reduce((sum, s) => sum + s.value, 0),
  );

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
        console.log(response.data);
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
