import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { DashboardFilters, DashboardKpis, DashboardService, DashboardTotals } from './dashboard.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-dashboard-content',
  standalone: true,
  imports: [CommonModule, TranslateModule, FormsModule, ButtonModule],
  template: `
    <div>
      <div class="grid mb-4">
        <div class="col-12">
          <div class="surface-card border-round p-4 shadow-2">
            <div class="flex align-items-start justify-content-between flex-column md:flex-row gap-3">
              <div>
                <h3 class="mt-0 mb-1">{{ 'dashboardPage.filters.title' | translate }}</h3>
                <p class="text-600 mb-0">{{ 'dashboardPage.filters.subtitle' | translate }}</p>
              </div>
              <div class="flex align-items-center gap-2 flex-wrap">
                <button pButton type="button" class="p-button-outlined" (click)="resetFilters()">
                  {{ 'dashboardPage.filters.reset' | translate }}
                </button>
                <button pButton type="button" (click)="applyFilters()">
                  {{ 'dashboardPage.filters.apply' | translate }}
                </button>
              </div>
            </div>
            <div class="grid mt-3">
              <div class="col-12 md:col-3">
                <label class="text-500 text-sm mb-1 block">{{ 'dashboardPage.filters.timeframe' | translate }}</label>
                <select class="p-inputtext p-component w-full" [(ngModel)]="filterForm.timeframe" (ngModelChange)="onTimeframeChange()">
                  <option value="all">{{ 'dashboardPage.filters.timeframes.all' | translate }}</option>
                  <option value="daily">{{ 'dashboardPage.filters.timeframes.daily' | translate }}</option>
                  <option value="monthly">{{ 'dashboardPage.filters.timeframes.monthly' | translate }}</option>
                  <option value="yearly">{{ 'dashboardPage.filters.timeframes.yearly' | translate }}</option>
                  <option value="custom">{{ 'dashboardPage.filters.timeframes.custom' | translate }}</option>
                </select>
              </div>
              <div class="col-12 md:col-3">
                <label class="text-500 text-sm mb-1 block">{{ 'dashboardPage.filters.from' | translate }}</label>
                <input type="date" class="p-inputtext p-component w-full" [(ngModel)]="customDateFrom" [disabled]="filterForm.timeframe !== 'custom'">
              </div>
              <div class="col-12 md:col-3">
                <label class="text-500 text-sm mb-1 block">{{ 'dashboardPage.filters.to' | translate }}</label>
                <input type="date" class="p-inputtext p-component w-full" [(ngModel)]="customDateTo" [disabled]="filterForm.timeframe !== 'custom'">
              </div>
              <div class="col-12 md:col-3">
                <label class="text-500 text-sm mb-1 block">{{ 'dashboardPage.filters.agent' | translate }}</label>
                <input type="text" class="p-inputtext p-component w-full" [(ngModel)]="filterForm.agent">
              </div>
              <div class="col-12 md:col-3">
                <label class="text-500 text-sm mb-1 block">{{ 'dashboardPage.filters.mediaBuyer' | translate }}</label>
                <input type="text" class="p-inputtext p-component w-full" [(ngModel)]="filterForm.mediaBuyer">
              </div>
              <div class="col-12 md:col-3">
                <label class="text-500 text-sm mb-1 block">{{ 'dashboardPage.filters.product' | translate }}</label>
                <input type="text" class="p-inputtext p-component w-full" [(ngModel)]="filterForm.product">
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="grid mb-4">
        <div class="col-12">
          <div class="surface-card border-round p-4 shadow-2">
            <div class="flex align-items-end justify-content-between mb-3">
              <div>
                <h2 class="mt-0">{{ 'dashboardPage.title' | translate }}</h2>
                <p class="text-600 mb-0">{{ 'dashboardPage.subtitle' | translate }}</p>
              </div>
              <span class="text-sm text-500">
                <ng-container *ngIf="statsLoading || kpisLoading; else statsReady">
                  {{ 'dashboardPage.stats.loading' | translate }}
                </ng-container>
                <ng-template #statsReady>{{ 'dashboardPage.stats.updated' | translate }}</ng-template>
              </span>
            </div>
            <div class="grid">
              <ng-container *ngIf="dashboardTotals; else statsLoadingTpl">
                <div class="col-12 sm:col-6 lg:col-3" *ngFor="let stat of statCards">
                  <div class="surface-card border-1 border-primary border-round h-full p-3 surface-ground">
                    <div class="text-xs text-500 uppercase">{{ stat.label }}</div>
                    <div class="text-3xl font-bold mt-2">{{ stat.value }}</div>
                    <div class="text-sm text-500 mt-1">{{ stat.description }}</div>
                  </div>
                </div>
              </ng-container>
              <ng-template #statsLoadingTpl>
                <div class="col-12">
                  <div class="text-sm text-500 text-center">{{ 'dashboardPage.stats.loading' | translate }}</div>
                </div>
              </ng-template>
            </div>
          </div>
        </div>
      </div>

      <div class="grid mb-4">
        <div class="col-12">
          <div class="surface-card border-round p-4 shadow-2">
            <h3 class="mt-0">{{ 'dashboardPage.kpis.title' | translate }}</h3>
            <p class="text-500">{{ 'dashboardPage.kpis.subtitle' | translate }}</p>
            <div class="grid mt-3">
              <ng-container *ngIf="kpis; else kpiLoadingTpl">
                <div class="col-12 sm:col-6 md:col-4 lg:col-3" *ngFor="let kpi of kpiCards">
                  <div class="surface-card border-1 border-300 border-round h-full p-3 surface-ground">
                    <div class="text-xs text-500 uppercase">{{ kpi.label }}</div>
                    <div class="text-3xl font-bold mt-2">{{ kpi.value }}</div>
                    <div class="text-sm text-500 mt-1">{{ kpi.detail }}</div>
                  </div>
                </div>
              </ng-container>
              <ng-template #kpiLoadingTpl>
                <div class="col-12">
                  <div class="text-sm text-500 text-center">{{ 'dashboardPage.kpis.loading' | translate }}</div>
                </div>
              </ng-template>
            </div>
          </div>
        </div>
      </div>

      <div class="grid">
        <div class="col-12 lg:col-6" *ngFor="let insight of roleInsights">
          <div class="surface-card border-round p-4 shadow-1 mb-3">
            <h4 class="mt-0">{{ insight.title }}</h4>
            <ul class="list-none p-0 m-0 text-sm text-500 space-y-2">
              <li *ngFor="let detail of insight.details">
                <i class="pi pi-check text-green-500 mr-2" aria-hidden="true"></i>
                {{ detail }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  `
})
export class DashboardContentComponent implements OnInit, OnDestroy {
  private statsSub?: Subscription;
  private kpisSub?: Subscription;
  private langSub?: Subscription;
  dashboardTotals?: DashboardTotals;
  statsLoading = true;
  kpisLoading = true;
  kpis?: DashboardKpis;
  roleInsights: RoleInsight[] = [];
  filterForm: DashboardFilterForm = { timeframe: 'all' };
  customDateFrom?: string;
  customDateTo?: string;
  appliedFilters?: DashboardFilters;

  constructor(private translate: TranslateService, private dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.applyFilters();
    this.roleInsights = this.buildRoleInsights();
    this.langSub = new Subscription();
    this.langSub.add(this.translate.onLangChange.subscribe(() => this.roleInsights = this.buildRoleInsights()));
    this.langSub.add(this.translate.onTranslationChange.subscribe(() => this.roleInsights = this.buildRoleInsights()));
  }

  ngOnDestroy(): void {
    this.statsSub?.unsubscribe();
    this.kpisSub?.unsubscribe();
    this.langSub?.unsubscribe();
  }

  applyFilters(): void {
    const filters = this.resolveFilters();
    this.appliedFilters = filters;
    this.loadStats(filters);
    this.loadKpis(filters);
  }

  resetFilters(): void {
    this.filterForm = { timeframe: 'all' };
    this.customDateFrom = undefined;
    this.customDateTo = undefined;
    this.applyFilters();
  }

  onTimeframeChange(): void {
    if (this.filterForm.timeframe !== 'custom') {
      this.customDateFrom = undefined;
      this.customDateTo = undefined;
    }
  }

  private loadStats(filters?: DashboardFilters): void {
    this.statsLoading = true;
    this.statsSub?.unsubscribe();
    this.statsSub = this.dashboardService.getTotals(filters ?? this.appliedFilters).subscribe({
      next: (totals) => {
        this.dashboardTotals = totals;
        this.statsLoading = false;
      },
      error: () => {
        this.dashboardTotals = undefined;
        this.statsLoading = false;
      }
    });
  }

  private loadKpis(filters?: DashboardFilters): void {
    this.kpisLoading = true;
    this.kpisSub?.unsubscribe();
    this.kpisSub = this.dashboardService.getKpis(filters ?? this.appliedFilters).subscribe({
      next: (kpis) => {
        this.kpis = kpis;
        this.kpisLoading = false;
      },
      error: () => {
        this.kpis = undefined;
        this.kpisLoading = false;
      }
    });
  }

  private resolveFilters(): DashboardFilters | undefined {
    const filters: DashboardFilters = {};
    const range = this.computeDateRange();
    if (range) {
      filters.fromDate = range.from;
      filters.toDate = range.to;
    }
    const agent = this.trimToUndefined(this.filterForm.agent);
    const mediaBuyer = this.trimToUndefined(this.filterForm.mediaBuyer);
    const product = this.trimToUndefined(this.filterForm.product);
    if (agent) {
      filters.agent = agent;
    }
    if (mediaBuyer) {
      filters.mediaBuyer = mediaBuyer;
    }
    if (product) {
      filters.product = product;
    }
    return Object.keys(filters).length ? filters : undefined;
  }

  private computeDateRange(): { from: string; to: string } | null {
    const timeframe = this.filterForm.timeframe;
    const today = new Date();
    if (timeframe === 'daily') {
      const iso = this.toIsoDate(today);
      return { from: iso, to: iso };
    }
    if (timeframe === 'monthly') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from: this.toIsoDate(start), to: this.toIsoDate(today) };
    }
    if (timeframe === 'yearly') {
      const start = new Date(today.getFullYear(), 0, 1);
      return { from: this.toIsoDate(start), to: this.toIsoDate(today) };
    }
    if (timeframe === 'custom') {
      const start = this.trimToUndefined(this.customDateFrom);
      const end = this.trimToUndefined(this.customDateTo ?? this.customDateFrom);
      if (start || end) {
        const from = start ?? end;
        const to = end ?? start ?? from;
        if (from && to) {
          return { from, to };
        }
      }
    }
    return null;
  }

  private toIsoDate(value: Date): string {
    return value.toISOString().slice(0, 10);
  }

  private trimToUndefined(value?: string): string | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }
    const trimmed = value.toString().trim();
    return trimmed ? trimmed : undefined;
  }

  get statCards(): DashboardStatCard[] {
    if (!this.dashboardTotals) {
      return [];
    }
    const { products, orders, expenses, ads } = this.dashboardTotals;
    return [
      {
        label: this.translate.instant('dashboardPage.stats.products'),
        value: this.formatCount(products),
        description: this.translate.instant('dashboardPage.stats.productsDetail')
      },
      {
        label: this.translate.instant('dashboardPage.stats.orders'),
        value: this.formatCount(orders),
        description: this.translate.instant('dashboardPage.stats.ordersDetail')
      },
      {
        label: this.translate.instant('dashboardPage.stats.expenses'),
        value: this.formatCount(expenses),
        description: this.translate.instant('dashboardPage.stats.expensesDetail')
      },
      {
        label: this.translate.instant('dashboardPage.stats.ads'),
        value: this.formatCount(ads),
        description: this.translate.instant('dashboardPage.stats.adsDetail')
      }
    ];
  }

  get kpiCards(): DashboardKpiCard[] {
    if (!this.kpis) {
      return [];
    }
    return [
    {
      label: this.translate.instant('dashboardPage.kpiLabels.confirmationRate'),
      value: this.formatPercent(this.kpis.confirmationRate),
      detail: this.translate.instant('dashboardPage.kpiDetails.confirmationRate')
    },
    {
      label: this.translate.instant('dashboardPage.kpiLabels.deliveryRate'),
      value: this.formatPercent(this.kpis.deliveryRate),
      detail: this.translate.instant('dashboardPage.kpiDetails.deliveryRate')
    },
    {
      label: this.translate.instant('dashboardPage.kpiLabels.profitPerProduct'),
      value: this.formatCurrency(this.kpis.profitPerProduct),
      detail: this.translate.instant('dashboardPage.kpiDetails.profitPerProduct')
    },
    {
      label: this.translate.instant('dashboardPage.kpiLabels.agentCommission'),
      value: this.formatCurrency(this.kpis.agentCommission),
      detail: this.translate.instant('dashboardPage.kpiDetails.agentCommission')
    },
    {
      label: this.translate.instant('dashboardPage.kpiLabels.totalRevenue'),
      value: this.formatCurrency(this.kpis.totalRevenue),
      detail: this.translate.instant('dashboardPage.kpiDetails.totalRevenue')
    },
    {
      label: this.translate.instant('dashboardPage.kpiLabels.totalProfit'),
      value: this.formatCurrency(this.kpis.totalProfit),
      detail: this.translate.instant('dashboardPage.kpiDetails.totalProfit')
    },
    {
      label: this.translate.instant('dashboardPage.kpiLabels.avgOrderValue'),
      value: this.formatCurrency(this.kpis.averageOrderValue),
      detail: this.translate.instant('dashboardPage.kpiDetails.avgOrderValue')
    },
    {
      label: this.translate.instant('dashboardPage.kpiLabels.roas'),
      value: this.formatDecimal(this.kpis.roas),
      detail: this.translate.instant('dashboardPage.kpiDetails.roas')
    },
    {
      label: this.translate.instant('dashboardPage.kpiLabels.cac'),
      value: this.formatCurrency(this.kpis.cac),
      detail: this.translate.instant('dashboardPage.kpiDetails.cac')
    }
    ];
  }

  private buildRoleInsights(): RoleInsight[] {
    return [
      {
        title: this.translate.instant('dashboardPage.roles.admin.title'),
        details: [
          this.translate.instant('dashboardPage.roles.admin.totalSales'),
          this.translate.instant('dashboardPage.roles.admin.profitPerProduct'),
          this.translate.instant('dashboardPage.roles.admin.commissionPerAgent'),
          this.translate.instant('dashboardPage.roles.admin.performanceBreakdown')
        ]
      },
      {
        title: this.translate.instant('dashboardPage.roles.supervisor.title'),
        details: [
          this.translate.instant('dashboardPage.roles.supervisor.allOrders'),
          this.translate.instant('dashboardPage.roles.supervisor.reassignOrders'),
          this.translate.instant('dashboardPage.roles.supervisor.agentPerformance')
        ]
      },
      {
        title: this.translate.instant('dashboardPage.roles.agent.title'),
        details: [
          this.translate.instant('dashboardPage.roles.agent.personalPerformance'),
          this.translate.instant('dashboardPage.roles.agent.assignedOrders')
        ]
      },
      {
        title: this.translate.instant('dashboardPage.roles.media.title'),
        details: [
          this.translate.instant('dashboardPage.roles.media.activeProducts'),
          this.translate.instant('dashboardPage.roles.media.adSpend'),
          this.translate.instant('dashboardPage.roles.media.costPerLead')
        ]
      }
    ];
  }

  private formatCount(value: number): string {
    return new Intl.NumberFormat().format(value);
  }

  private formatPercent(value: number): string {
    return `${(value * 100).toFixed(1)}%`;
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  }

  private formatDecimal(value: number): string {
    return value.toFixed(2);
  }
}

type DashboardTimeframe = 'all' | 'daily' | 'monthly' | 'yearly' | 'custom';

interface DashboardFilterForm {
  timeframe: DashboardTimeframe;
  agent?: string;
  mediaBuyer?: string;
  product?: string;
}

interface DashboardStatCard {
  label: string;
  value: string;
  description: string;
}

interface DashboardKpiCard {
  label: string;
  value: string;
  detail: string;
}

interface RoleInsight {
  title: string;
  details: string[];
}
