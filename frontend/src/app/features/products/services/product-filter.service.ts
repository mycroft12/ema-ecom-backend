import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CustomFilter } from '../models/filter.model';

@Injectable({ providedIn: 'root' })
export class ProductFilterService {
  // Filters API not available on backend yet; keep local-only behavior for now
  // private readonly http = inject(HttpClient);

  private readonly filtersSignal = signal<CustomFilter[]>([]);
  private readonly activeFilterSignal = signal<CustomFilter | null>(null);

  readonly filters = this.filtersSignal.asReadonly();
  readonly activeFilter = this.activeFilterSignal.asReadonly();

  loadFilters(): void {
    // No backend yet; start with empty list
    this.filtersSignal.set([]);
  }

  saveFilter(filter: CustomFilter): Observable<CustomFilter> {
    // Simulate save locally by appending to the list
    const newFilter = { ...filter, id: Date.now() } as CustomFilter;
    this.filtersSignal.set([...(this.filtersSignal()), newFilter]);
    return new Observable<CustomFilter>(observer => { observer.next(newFilter); observer.complete(); });
  }

  updateFilter(id: number, filter: CustomFilter): Observable<CustomFilter> {
    const updated = { ...filter, id } as CustomFilter;
    this.filtersSignal.set(this.filtersSignal().map(f => f.id === id ? updated : f));
    return new Observable<CustomFilter>(observer => { observer.next(updated); observer.complete(); });
  }

  deleteFilter(id: number): Observable<void> {
    this.filtersSignal.set(this.filtersSignal().filter(f => f.id !== id));
    if (this.activeFilterSignal()?.id === id) {
      this.activeFilterSignal.set(null);
    }
    return new Observable<void>(observer => { observer.next(); observer.complete(); });
  }

  setActiveFilter(filter: CustomFilter | null): void {
    this.activeFilterSignal.set(filter);
  }
}
