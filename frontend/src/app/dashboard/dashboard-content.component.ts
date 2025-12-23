import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { SelectButtonModule } from 'primeng/selectbutton';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { DashboardFilters, DashboardKpis, DashboardLookupOption, DashboardService, DashboardTotals } from './dashboard.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-dashboard-content',
  standalone: true,
  imports: [CommonModule, TranslateModule, FormsModule, ButtonModule, SelectButtonModule, CalendarModule, DropdownModule],
  template: `
    <div>
      <div class="grid mb-4">
        <div class="col-12">
          <div class="surface-card border-round-xl p-4 shadow-2">
            <div class="grid align-items-start">
              <div class="col-12 flex flex-column gap-3">
                <div class="flex align-items-center justify-content-between flex-column sm:flex-row gap-2">
                  <div>
                    <p class="text-xs text-primary font-semibold mb-1">{{ 'dashboardPage.filters.title' | translate }}</p>
                    <h2 class="mt-0 mb-1">{{ 'dashboardPage.title' | translate }}</h2>
                    <p class="text-600 mb-0">{{ 'dashboardPage.subtitle' | translate }}</p>
                  </div>
                  <div class="flex align-items-center gap-3 text-500 text-sm">
                    <span class="flex align-items-center gap-2">
                      <i class="pi pi-clock text-primary"></i>
                      <ng-container *ngIf="statsLoading || kpisLoading; else metricsReady">
                        {{ 'dashboardPage.stats.loading' | translate }}
                      </ng-container>
                      <ng-template #metricsReady>{{ 'dashboardPage.filters.statusLabel' | translate }}</ng-template>
                    </span>
                    <button
                      pButton
                      type="button"
                      class="p-button-text p-button-rounded"
                      (click)="filtersCollapsed = !filtersCollapsed">
                      <span class="flex align-items-center gap-1" [ngClass]="filtersCollapsed ? 'text-green-600' : 'text-500'">
                        <i [class]="filtersCollapsed ? 'pi pi-chevron-down' : 'pi pi-chevron-up'"></i>
                        <span>{{ (filtersCollapsed ? 'dashboardPage.filters.expand' : 'dashboardPage.filters.collapse') | translate }}</span>
                      </span>
                    </button>
                  </div>
                </div>

                <p-selectButton
                  class="w-full"
                  [options]="timeframeOptions"
                  [(ngModel)]="filterForm.timeframe"
                  optionLabel="label"
                  optionValue="key"
                  [allowEmpty]="false"
                  (onChange)="setTimeframe($event.value)">
                </p-selectButton>

                <div class="grid" *ngIf="!filtersCollapsed">
                  <div class="col-12 md:col-6">
                    <label class="text-500 text-sm mb-1 block">{{ 'dashboardPage.filters.from' | translate }}</label>
                    <p-calendar
                      [(ngModel)]="customDateFrom"
                      [disabled]="filterForm.timeframe !== 'custom'"
                      dateFormat="yy-mm-dd"
                      showIcon="true"
                      class="w-full"
                      (onSelect)="onTimeframeChange()">
                    </p-calendar>
                  </div>
                  <div class="col-12 md:col-6">
                    <label class="text-500 text-sm mb-1 block">{{ 'dashboardPage.filters.to' | translate }}</label>
                    <p-calendar
                      [(ngModel)]="customDateTo"
                      [disabled]="filterForm.timeframe !== 'custom'"
                      dateFormat="yy-mm-dd"
                      showIcon="true"
                      class="w-full"
                      (onSelect)="onTimeframeChange()">
                    </p-calendar>
                  </div>
                  <div class="col-12 md:col-6">
                    <label class="text-500 text-sm mb-1 block">{{ 'dashboardPage.filters.agent' | translate }}</label>
                    <p-dropdown
                      class="w-full"
                      [options]="agentOptions"
                      optionLabel="label"
                      optionValue="label"
                      [filter]="true"
                      filterPlaceholder="{{ 'dashboardPage.filters.anyAgent' | translate }}"
                      [(ngModel)]="filterForm.agent"
                      [showClear]="true"
                      [placeholder]="('dashboardPage.filters.anyAgent' | translate)">
                    </p-dropdown>
                  </div>
                  <div class="col-12 md:col-6">
                    <label class="text-500 text-sm mb-1 block">{{ 'dashboardPage.filters.mediaBuyer' | translate }}</label>
                    <p-dropdown
                      class="w-full"
                      [options]="mediaBuyerOptions"
                      optionLabel="label"
                      optionValue="label"
                      [filter]="true"
                      filterPlaceholder="{{ 'dashboardPage.filters.anyMediaBuyer' | translate }}"
                      [(ngModel)]="filterForm.mediaBuyer"
                      [showClear]="true"
                      [placeholder]="('dashboardPage.filters.anyMediaBuyer' | translate)">
                    </p-dropdown>
                  </div>
                  <div class="col-12">
                    <label class="text-500 text-sm mb-1 block">{{ 'dashboardPage.filters.product' | translate }}</label>
                    <p-dropdown
                      class="w-full"
                      [options]="productOptions"
                      optionLabel="label"
                      optionValue="label"
                      [filter]="true"
                      filterPlaceholder="{{ 'dashboardPage.filters.anyProduct' | translate }}"
                      [(ngModel)]="filterForm.product"
                      [showClear]="true"
                      [placeholder]="('dashboardPage.filters.anyProduct' | translate)">
                    </p-dropdown>
                  </div>
                </div>

                <div class="grid align-items-center">
                  <div class="col-12 md:col-8">
                    <div class="inline-flex align-items-center px-3 py-2 border-1 border-200 surface-100 text-sm text-700 border-round">
                      <i class="pi pi-calendar mr-2 text-primary"></i>
                      <span>{{ activeDateRangeLabel }}</span>
                    </div>
                    <div class="flex flex-wrap gap-2 mt-2" *ngIf="activeFilterBadges.length && !filtersCollapsed">
                      <span
                        *ngFor="let badge of activeFilterBadges"
                        class="py-1 px-2 surface-100 border-round border-1 border-200 text-sm text-700">
                        <i [class]="badge.icon" class="mr-2 text-primary"></i>{{ badge.label }}: <strong>{{ badge.value }}</strong>
                      </span>
                    </div>
                  </div>
                  <div class="col-12 md:col-4 flex align-items-center justify-content-end gap-2 mt-3 md:mt-0" *ngIf="!filtersCollapsed">
                    <button pButton type="button" class="p-button-text" (click)="resetFilters()">
                      {{ 'dashboardPage.filters.reset' | translate }}
                    </button>
                    <button pButton type="button" (click)="applyFilters()">
                      {{ 'dashboardPage.filters.apply' | translate }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="grid mb-4">
        <div class="col-12">
          <div class="surface-card border-round-xl p-4 shadow-2">
            <div class="flex align-items-center justify-content-between mb-3">
              <div>
                <h3 class="mt-0 mb-1">{{ 'dashboardPage.stats.updated' | translate }}</h3>
                <p class="text-600 mb-0">{{ 'dashboardPage.filters.subtitle' | translate }}</p>
              </div>
              <span class="text-sm text-500 flex align-items-center gap-2">
                <i class="pi pi-calendar text-primary"></i>
                {{ activeDateRangeLabel }}
              </span>
            </div>
            <div class="grid">
              <ng-container *ngIf="dashboardTotals; else statsLoadingTpl">
                <div class="col-12 sm:col-6 lg:col-3" *ngFor="let stat of statCards">
                  <div class="border-round-xl h-full p-3 surface-100 border-1 border-200">
                    <div class="flex align-items-center justify-content-between">
                      <div class="text-xs text-500 uppercase">{{ stat.label }}</div>
                      <span class="p-button p-button-rounded p-button-text p-button-sm">
                        <i [class]="stat.icon"></i>
                      </span>
                    </div>
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
          <div class="surface-card border-round-xl p-4 shadow-2">
            <div class="flex align-items-start justify-content-between flex-column md:flex-row gap-2">
              <div>
                <h3 class="mt-0">{{ 'dashboardPage.kpis.title' | translate }}</h3>
                <p class="text-500 mb-0">{{ 'dashboardPage.kpis.subtitle' | translate }}</p>
              </div>
              <span class="text-sm text-500 flex align-items-center gap-2">
                <i class="pi pi-filter text-primary"></i>
                {{ activeDateRangeLabel }}
              </span>
            </div>
            <div class="grid mt-3">
              <ng-container *ngIf="kpis; else kpiLoadingTpl">
                <div class="col-12 sm:col-6 md:col-4 lg:col-3" *ngFor="let kpi of kpiCards">
                  <div class="border-round-xl h-full p-3 surface-100 border-1 border-200">
                    <div class="flex align-items-center justify-content-between">
                      <span class="text-xs text-500 uppercase">{{ kpi.label }}</span>
                      <span class="px-2 py-1 text-xs border-round surface-200 text-700 inline-flex align-items-center gap-2">
                        <i [class]="kpi.icon"></i>
                        <span>{{ kpi.tag }}</span>
                      </span>
                    </div>
                    <div class="text-3xl font-bold mt-3">{{ kpi.value }}</div>
                    <div class="text-sm text-500 mt-2">{{ kpi.detail }}</div>
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
          <div class="surface-card border-round p-4 shadow-1 mb-3 border-1 border-200">
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
  agentOptions: DashboardLookupOption[] = [];
  mediaBuyerOptions: DashboardLookupOption[] = [];
  productOptions: DashboardLookupOption[] = [];
  readonly timeframePresets: Array<{ key: DashboardTimeframe; labelKey: string }> = [
    { key: 'all', labelKey: 'dashboardPage.filters.timeframes.all' },
    { key: 'daily', labelKey: 'dashboardPage.filters.timeframes.daily' },
    { key: 'monthly', labelKey: 'dashboardPage.filters.timeframes.monthly' },
    { key: 'yearly', labelKey: 'dashboardPage.filters.timeframes.yearly' },
    { key: 'custom', labelKey: 'dashboardPage.filters.timeframes.custom' }
  ];
  filterForm: DashboardFilterForm = { timeframe: 'all' };
  customDateFrom?: string | Date;
  customDateTo?: string | Date;
  appliedFilters?: DashboardFilters;
  appliedTimeframe: DashboardTimeframe = 'all';
  filtersCollapsed = false;

  constructor(private translate: TranslateService, private dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.loadLookups();
    this.applyFilters();
    this.roleInsights = this.buildRoleInsights();
    this.langSub = new Subscription();
    this.langSub.add(this.translate.onLangChange.subscribe(() => this.roleInsights = this.buildRoleInsights()));
    this.langSub.add(this.translate.onTranslationChange.subscribe(() => this.roleInsights = this.buildRoleInsights()));
  }

  get timeframeOptions(): Array<{ key: DashboardTimeframe; label: string }> {
    return this.timeframePresets.map(preset => ({
      key: preset.key,
      label: this.translate.instant(preset.labelKey)
    }));
  }

  ngOnDestroy(): void {
    this.statsSub?.unsubscribe();
    this.kpisSub?.unsubscribe();
    this.langSub?.unsubscribe();
  }

  applyFilters(): void {
    const filters = this.resolveFilters();
    this.appliedFilters = filters;
    this.appliedTimeframe = this.filterForm.timeframe;
    this.loadStats(filters);
    this.loadKpis(filters);
  }

  resetFilters(): void {
    this.filterForm = { timeframe: 'all' };
    this.customDateFrom = undefined;
    this.customDateTo = undefined;
    this.applyFilters();
  }

  setTimeframe(timeframe: DashboardTimeframe): void {
    this.filterForm.timeframe = timeframe;
    this.onTimeframeChange();
    if (timeframe !== 'custom') {
      this.applyFilters();
    }
  }

  onTimeframeChange(): void {
    if (this.filterForm.timeframe !== 'custom') {
      this.customDateFrom = undefined;
      this.customDateTo = undefined;
    }
  }

  private loadLookups(): void {
    this.dashboardService.getAgentOptions().subscribe(options => this.agentOptions = options ?? []);
    this.dashboardService.getMediaBuyerOptions().subscribe(options => this.mediaBuyerOptions = options ?? []);
    this.dashboardService.getProductOptions().subscribe(options => this.productOptions = options ?? []);
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

  get activeDateRangeLabel(): string {
    const filters = this.appliedFilters;
    if (filters?.fromDate || filters?.toDate) {
      const from = filters.fromDate ?? filters.toDate;
      const to = filters.toDate ?? filters.fromDate;
      if (from && to && from !== to) {
        return `${from} → ${to}`;
      }
      if (from) {
        return from;
      }
    }
    const preset = this.timeframePresets.find(p => p.key === this.appliedTimeframe);
    return preset ? this.translate.instant(preset.labelKey) : '';
  }

  get activeFilterBadges(): Array<{ label: string; value: string; icon: string }> {
    const filters = this.appliedFilters;
    if (!filters) {
      return [];
    }
    const badges: Array<{ label: string; value: string; icon: string }> = [];
    if (filters.agent) {
      badges.push({ label: this.translate.instant('dashboardPage.filters.agent'), value: filters.agent, icon: 'pi pi-user' });
    }
    if (filters.mediaBuyer) {
      badges.push({ label: this.translate.instant('dashboardPage.filters.mediaBuyer'), value: filters.mediaBuyer, icon: 'pi pi-megaphone' });
    }
    if (filters.product) {
      badges.push({ label: this.translate.instant('dashboardPage.filters.product'), value: filters.product, icon: 'pi pi-tag' });
    }
    return badges;
  }

  private toIsoDate(value: Date): string {
    return value.toISOString().slice(0, 10);
  }

  private trimToUndefined(value?: string | Date): string | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }
    if (value instanceof Date) {
      return this.toIsoDate(value);
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
        description: this.translate.instant('dashboardPage.stats.productsDetail'),
        icon: 'pi pi-box'
      },
      {
        label: this.translate.instant('dashboardPage.stats.orders'),
        value: this.formatCount(orders),
        description: this.translate.instant('dashboardPage.stats.ordersDetail'),
        icon: 'pi pi-shopping-cart'
      },
      {
        label: this.translate.instant('dashboardPage.stats.expenses'),
        value: this.formatCount(expenses),
        description: this.translate.instant('dashboardPage.stats.expensesDetail'),
        icon: 'pi pi-wallet'
      },
      {
        label: this.translate.instant('dashboardPage.stats.ads'),
        value: this.formatCount(ads),
        description: this.translate.instant('dashboardPage.stats.adsDetail'),
        icon: 'pi pi-megaphone'
      }
    ];
  }

  get kpiCards(): DashboardKpiCard[] {
    if (!this.kpis) {
      return [];
    }
    const timeframeText = this.activeDateRangeLabel;
    return [
    {
      label: this.translate.instant('dashboardPage.kpiLabels.confirmationRate'),
      value: this.formatPercent(this.kpis.confirmationRate),
      detail: this.translate.instant('dashboardPage.kpiDetails.confirmationRate'),
      icon: 'pi pi-check-circle',
      tag: timeframeText
    },
    {
      label: this.translate.instant('dashboardPage.kpiLabels.deliveryRate'),
      value: this.formatPercent(this.kpis.deliveryRate),
      detail: this.translate.instant('dashboardPage.kpiDetails.deliveryRate'),
      icon: 'pi pi-send',
      tag: timeframeText
    },
    {
      label: this.translate.instant('dashboardPage.kpiLabels.profitPerProduct'),
      value: this.formatCurrency(this.kpis.profitPerProduct),
      detail: this.translate.instant('dashboardPage.kpiDetails.profitPerProduct'),
      icon: 'pi pi-briefcase',
      tag: timeframeText
    },
    {
      label: this.translate.instant('dashboardPage.kpiLabels.agentCommission'),
      value: this.formatCurrency(this.kpis.agentCommission),
      detail: this.translate.instant('dashboardPage.kpiDetails.agentCommission'),
      icon: 'pi pi-users',
      tag: timeframeText
    },
    {
      label: this.translate.instant('dashboardPage.kpiLabels.totalRevenue'),
      value: this.formatCurrency(this.kpis.totalRevenue),
      detail: this.translate.instant('dashboardPage.kpiDetails.totalRevenue'),
      icon: 'pi pi-chart-line',
      tag: timeframeText
    },
    {
      label: this.translate.instant('dashboardPage.kpiLabels.totalProfit'),
      value: this.formatCurrency(this.kpis.totalProfit),
      detail: this.translate.instant('dashboardPage.kpiDetails.totalProfit'),
      icon: 'pi pi-wallet',
      tag: timeframeText
    },
    {
      label: this.translate.instant('dashboardPage.kpiLabels.avgOrderValue'),
      value: this.formatCurrency(this.kpis.averageOrderValue),
      detail: this.translate.instant('dashboardPage.kpiDetails.avgOrderValue'),
      icon: 'pi pi-box',
      tag: timeframeText
    },
    {
      label: this.translate.instant('dashboardPage.kpiLabels.roas'),
      value: this.formatDecimal(this.kpis.roas),
      detail: this.translate.instant('dashboardPage.kpiDetails.roas'),
      icon: 'pi pi-bolt',
      tag: timeframeText
    },
    {
      label: this.translate.instant('dashboardPage.kpiLabels.cac'),
      value: this.formatCurrency(this.kpis.cac),
      detail: this.translate.instant('dashboardPage.kpiDetails.cac'),
      icon: 'pi pi-sliders-h',
      tag: timeframeText
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
  icon: string;
}

interface DashboardKpiCard {
  label: string;
  value: string;
  detail: string;
  icon: string;
  tag: string;
}

interface RoleInsight {
  title: string;
  details: string[];
}
