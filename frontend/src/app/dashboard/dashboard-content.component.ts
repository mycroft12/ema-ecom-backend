import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DashboardService, DashboardTotals } from './dashboard.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-dashboard-content',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div>
      <div class="grid mb-4">
        <div class="col-12">
          <div class="surface-card border-round p-4 shadow-2">
            <div class="flex align-items-end justify-content-between mb-3">
              <div>
                <h2 class="mt-0">{{ 'dashboardPage.title' | translate }}</h2>
                <p class="text-600 mb-0">{{ 'dashboardPage.subtitle' | translate }}</p>
              </div>
              <span class="text-sm text-500">
                <ng-container *ngIf="statsLoading; else statsReady">
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
    </div>
  `
})
export class DashboardContentComponent implements OnInit, OnDestroy {
  private statsSub?: Subscription;
  dashboardTotals?: DashboardTotals;
  statsLoading = true;
  constructor(private translate: TranslateService, private dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.loadStats();
  }

  ngOnDestroy(): void {
    this.statsSub?.unsubscribe();
  }

  private loadStats(): void {
    this.statsLoading = true;
    this.statsSub?.unsubscribe();
    this.statsSub = this.dashboardService.getTotals().subscribe({
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

  private formatCount(value: number): string {
    return new Intl.NumberFormat().format(value);
  }
}

interface DashboardStatCard {
  label: string;
  value: string;
  description: string;
}
