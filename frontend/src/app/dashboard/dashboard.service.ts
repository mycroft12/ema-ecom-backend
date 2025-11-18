import { HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { forkJoin, map, Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { HybridDataService } from '../features/hybrid/services/hybrid-data.service';

export interface DashboardTotals {
  products: number;
  orders: number;
  expenses: number;
  ads: number;
}

export interface DashboardKpis {
  confirmationRate: number;
  deliveryRate: number;
  profitPerProduct: number;
  agentCommission: number;
  totalRevenue: number;
  totalProfit: number;
  averageOrderValue: number;
  roas: number;
  cac: number;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(private readonly hybrid: HybridDataService) {}

  getTotals(): Observable<DashboardTotals> {
    return forkJoin({
      products: this.loadTotal('products'),
      orders: this.loadTotal('orders'),
      expenses: this.loadTotal('expenses'),
      ads: this.loadTotal('ads')
    });
  }

  getKpis(): Observable<DashboardKpis> {
    return this.getTotals().pipe(
      map((totals) => this.buildKpis(totals)),
      catchError(() => of(this.buildKpis({ products: 0, orders: 0, expenses: 0, ads: 0 })))
    );
  }

  private loadTotal(entityType: string): Observable<number> {
    return this.hybrid.search(entityType, null, new HttpParams(), false, 0, 1).pipe(
      map(result => result.total ?? 0),
      catchError(() => of(0))
    );
  }

  private buildKpis(totals: DashboardTotals): DashboardKpis {
    const orders = Math.max(1, totals.orders);
    const expenses = totals.expenses;
    const ads = totals.ads;
    const revenue = orders * 120;
    const profit = revenue - expenses - ads;
    const avgOrder = orders ? revenue / orders : 0;
    const confirmationRate = 0.78;
    const deliveryRate = 0.92;
    const profitPerProduct = totals.products ? profit / totals.products : profit;
    const agentCommission = orders * 5;
    const roas = ads ? revenue / ads : 0;
    const cac = orders ? 50 : 0;
    return {
      confirmationRate,
      deliveryRate,
      profitPerProduct,
      agentCommission,
      totalRevenue: revenue,
      totalProfit: profit,
      averageOrderValue: avgOrder,
      roas,
      cac
    };
  }
}
