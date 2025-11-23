import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { forkJoin, map, Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { HybridDataService } from '../features/hybrid/services/hybrid-data.service';
import { environment } from '../../environments/environment';

export interface DashboardTotals {
  products: number;
  orders: number;
  expenses: number;
  ads: number;
}

export interface DashboardFilters {
  fromDate?: string;
  toDate?: string;
  agent?: string;
  mediaBuyer?: string;
  product?: string;
}

export interface DashboardLookupOption {
  id: string;
  label: string;
  detail?: string | null;
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
  constructor(private readonly hybrid: HybridDataService, private readonly http: HttpClient) {}

  getTotals(filters?: DashboardFilters): Observable<DashboardTotals> {
    return forkJoin({
      products: this.loadTotal('products', filters),
      orders: this.loadTotal('orders', filters),
      expenses: this.loadTotal('expenses', filters),
      ads: this.loadTotal('ads', filters)
    });
  }

  getKpis(filters?: DashboardFilters): Observable<DashboardKpis> {
    return this.getTotals(filters).pipe(
      map((totals) => this.buildKpis(totals)),
      catchError(() => of(this.buildKpis({ products: 0, orders: 0, expenses: 0, ads: 0 })))
    );
  }

  private loadTotal(entityType: string, filters?: DashboardFilters): Observable<number> {
    const params = this.buildFilters(entityType, filters);
    const query = this.buildQuery(entityType, filters);
    return this.hybrid.search(entityType, query, params, false, 0, 1).pipe(
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

  private buildFilters(entityType: string, filters?: DashboardFilters): HttpParams {
    let params = new HttpParams();
    if (!filters) {
      return params;
    }
    const dateColumn = this.dateColumnFor(entityType);
    const range = this.normalizeDateRange(filters.fromDate, filters.toDate);
    if (dateColumn && range) {
      params = this.appendFilter(params, dateColumn, range, 'between', 'date');
    }

    const agent = this.trimToNull(filters.agent);
    if (agent && entityType.toLowerCase() === 'orders') {
      params = this.appendFilter(params, 'assigned_agent', agent, 'contains');
    }

    const mediaBuyer = this.trimToNull(filters.mediaBuyer);
    if (mediaBuyer && entityType.toLowerCase() === 'ads') {
      params = this.appendFilter(params, 'media_buyer', mediaBuyer, 'contains');
    }

    const product = this.trimToNull(filters.product);
    const productColumn = product ? this.productColumnFor(entityType) : null;
    if (product && productColumn) {
      params = this.appendFilter(params, productColumn, product, 'contains');
    }

    return params;
  }

  private buildQuery(entityType: string, filters?: DashboardFilters): string | null {
    if (!filters) {
      return null;
    }
    const mediaBuyer = this.trimToNull(filters.mediaBuyer);
    if (mediaBuyer && entityType.toLowerCase() !== 'ads') {
      return mediaBuyer;
    }
    const product = this.trimToNull(filters.product);
    if (product && !this.productColumnFor(entityType)) {
      return product;
    }
    return null;
  }

  private appendFilter(params: HttpParams, column: string, value: string | string[], matchMode: string, type?: string): HttpParams {
    const payload: Record<string, any> = { value, matchMode };
    if (type) {
      payload['type'] = type;
    }
    return params.append(`filter.${column}`, JSON.stringify(payload));
  }

  private dateColumnFor(entityType: string): string | null {
    const normalized = entityType.toLowerCase();
    if (normalized === 'orders') return 'created_at';
    if (normalized === 'ads') return 'spend_date';
    if (normalized === 'expenses') return 'expense_date';
    if (normalized === 'products') return 'created_at';
    return null;
  }

  private productColumnFor(entityType: string): string | null {
    const normalized = entityType.toLowerCase();
    if (normalized === 'orders') return 'product_summary';
    if (normalized === 'ads') return 'product_reference';
    if (normalized === 'products') return 'product_name';
    return null;
  }

  private normalizeDateRange(from?: string, to?: string): string[] | null {
    const start = this.trimToNull(from);
    const end = this.trimToNull(to ?? from);
    if (!start && !end) {
      return null;
    }
    if (start && end) {
      return [start, end];
    }
    const single = start || end;
    return single ? [single, single] : null;
  }

  private trimToNull(value?: string): string | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    const trimmed = value.toString().trim();
    return trimmed ? trimmed : undefined;
  }

  getAgentOptions(): Observable<DashboardLookupOption[]> {
    return this.http.get<Array<{ id: string; username: string; email?: string }>>(`${environment.apiBase}/api/dashboard/lookups/agents`).pipe(
      map(options => (options ?? []).map(opt => ({ id: opt.id, label: opt.username, detail: opt.email }))),
      catchError(() => of([]))
    );
  }

  getMediaBuyerOptions(): Observable<DashboardLookupOption[]> {
    return this.http.get<Array<{ id: string; username: string; email?: string }>>(`${environment.apiBase}/api/dashboard/lookups/media-buyers`).pipe(
      map(options => (options ?? []).map(opt => ({ id: opt.id, label: opt.username, detail: opt.email }))),
      catchError(() => of([]))
    );
  }

  getProductOptions(): Observable<DashboardLookupOption[]> {
    return this.http.get<Array<{ id: string; name: string }>>(`${environment.apiBase}/api/dashboard/lookups/products`).pipe(
      map(options => (options ?? []).map(opt => ({ id: opt.id, label: opt.name }))),
      catchError(() => of([]))
    );
  }
}
