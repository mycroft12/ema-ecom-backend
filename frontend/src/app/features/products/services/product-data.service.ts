import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Product, ProductPageResponse, RawProductDto } from '../models/product.model';
import { TableLazyLoadEvent } from '../models/filter.model';
import { ProductSchemaService } from './product-schema.service';

@Injectable({ providedIn: 'root' })
export class ProductDataService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBase}/api/products`;
  private readonly schemaService = inject(ProductSchemaService);

  private readonly productsSignal = signal<Product[]>([]);
  private readonly totalRecordsSignal = signal<number>(0);
  private readonly loadingSignal = signal<boolean>(false);

  readonly products = this.productsSignal.asReadonly();
  readonly totalRecords = this.totalRecordsSignal.asReadonly();
  readonly isLoading = this.loadingSignal.asReadonly();

  loadProducts(event: TableLazyLoadEvent, customFilterId?: number): Observable<ProductPageResponse> {
    this.loadingSignal.set(true);

    let params = new HttpParams()
      .set('page', Math.floor((event.first ?? 0) / (event.rows ?? 10)))
      .set('size', String(event.rows ?? 10));

    if (event.sortField) {
      const dir = event.sortOrder === 1 ? 'asc' : 'desc';
      params = params.set('sort', `${event.sortField},${dir}`);
    }

    if (event.globalFilter) {
      params = params.set('q', event.globalFilter);
    }

    if (event.filters) {
      Object.keys(event.filters).forEach(key => {
        const fv = (event.filters as any)[key];
        if (fv?.value !== null && fv?.value !== undefined) {
          params = params.set(`filter.${key}`, fv.value);
        }
      });
    }

    if (customFilterId) {
      params = params.set('customFilterId', customFilterId);
    }

    return this.http.get<ProductPageResponse>(this.apiUrl, { params }).pipe(
      tap(resp => {
        const flattened = (resp.content ?? []).map(item => this.flattenProduct(item));
        this.productsSignal.set(flattened);
        this.totalRecordsSignal.set(resp.totalElements);
        this.loadingSignal.set(false);
      })
    );
  }

  getProduct(id: string): Observable<Product> {
    return this.http.get<RawProductDto>(`${this.apiUrl}/${id}`).pipe(
      map(dto => this.flattenProduct(dto))
    );
  }

  createProduct(product: Partial<Product>): Observable<Product> {
    return this.http.post<RawProductDto>(this.apiUrl, product).pipe(
      map(dto => this.flattenProduct(dto))
    );
  }

  updateProduct(id: string, product: Partial<Product>): Observable<Product> {
    return this.http.put<RawProductDto>(`${this.apiUrl}/${id}`, product).pipe(
      map(dto => this.flattenProduct(dto))
    );
  }

  deleteProduct(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  bulkDelete(ids: string[]): Observable<void> {
    // Backend bulk-delete endpoint not available; delete sequentially using existing DELETE /{id}
    return new Observable<void>(observer => {
      const perform = async () => {
        for (const id of ids) {
          await this.http.delete<void>(`${this.apiUrl}/${id}`).toPromise().catch(() => {/* ignore individual failures */});
        }
        observer.next();
        observer.complete();
      };
      perform();
    });
  }

  private flattenProduct(dto: RawProductDto | null | undefined): Product {
    if (!dto) {
      return { id: '' };
    }
    const attributes = dto.attributes ?? {};
    const schemaLoaded = !!this.schemaService.schema();
    let filteredAttributes: Record<string, any>;
    if (!schemaLoaded) {
      filteredAttributes = attributes;
    } else {
      const allowedNames = new Set(this.schemaService.visibleColumns().map(c => c.name));
      filteredAttributes = Object.entries(attributes).reduce<Record<string, any>>((acc, [key, value]) => {
        if (allowedNames.has(key)) {
          acc[key] = value;
        }
        return acc;
      }, {});
    }
    return {
      id: dto.id,
      ...filteredAttributes
    };
  }

  exportToExcel(filters?: any): void {
    // Client-side CSV export of currently loaded page as a fallback
    const rows = this.products();
    if (!rows || !rows.length) {
      return;
    }
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(',')].concat(rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    this.download(blob, `products-export-${new Date().getTime()}.csv`);
  }

  private download(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }
}
