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

  private loadTotal(entityType: string): Observable<number> {
    return this.hybrid.search(entityType, null, new HttpParams(), false, 0, 1).pipe(
      map(result => result.total ?? 0),
      catchError(() => of(0))
    );
  }
}
