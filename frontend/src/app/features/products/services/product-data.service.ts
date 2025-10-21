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

  loadProducts(event: TableLazyLoadEvent): Observable<ProductPageResponse> {
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
      Object.entries(event.filters).forEach(([key, metadata]) => {
        const detail = this.extractFilterDetail(metadata);
        if (detail && !this.isEmptyFilterValue(detail.value)) {
          params = params.set(`filter.${key}`, detail.value);
          if (detail.matchMode) {
            params = params.set(`filter.${key}.matchMode`, detail.matchMode);
          }
        }
      });
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

  createProduct(attributes: Record<string, any>): Observable<Product> {
    return this.http.post<RawProductDto>(this.apiUrl, { attributes }).pipe(
      map(dto => this.flattenProduct(dto))
    );
  }

  updateProduct(id: string, attributes: Record<string, any>): Observable<Product> {
    return this.http.put<RawProductDto>(`${this.apiUrl}/${id}`, { attributes }).pipe(
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

  private extractFilterDetail(metadata: any): { value: string; matchMode?: string } | null {
    if (!metadata) {
      return null;
    }
    if (Array.isArray(metadata)) {
      for (const item of metadata) {
        const detail = this.extractFilterDetail(item);
        if (detail) {
          return detail;
        }
      }
      return null;
    }
    const serialized = this.serializeFilterValue(metadata.value);
    if (serialized !== null) {
      return { value: serialized, matchMode: metadata.matchMode };
    }
    if (Array.isArray(metadata.constraints)) {
      for (const constraint of metadata.constraints) {
        const detail = this.extractFilterDetail(constraint);
        if (detail) {
          return {
            value: detail.value,
            matchMode: detail.matchMode ?? metadata.matchMode
          };
        }
      }
    }
    return null;
  }

  private serializeFilterValue(value: any): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    if (Array.isArray(value)) {
      const normalized = value
        .map(item => this.normalizeFilterPrimitive(item))
        .filter(item => item !== null && item !== undefined);
      if (!normalized.length) {
        return null;
      }
      return JSON.stringify(normalized);
    }
    if (typeof value === 'object') {
      const normalized = this.normalizeFilterPrimitive(value);
      if (normalized === null || normalized === undefined) {
        return null;
      }
      return String(normalized).trim() || null;
    }
    const stringValue = String(value).trim();
    return stringValue === '' ? null : stringValue;
  }

  private normalizeFilterPrimitive(value: any): any {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value === 'object') {
      if ('value' in value) {
        return value.value;
      }
      if ('name' in value) {
        return value.name;
      }
      if ('label' in value) {
        return value.label;
      }
      return Object.values(value)
        .filter(v => v !== null && v !== undefined)
        .map(v => String(v))
        .join(' ');
    }
    return value;
  }

  private isEmptyFilterValue(value: any): boolean {
    if (value === null || value === undefined) {
      return true;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed || trimmed === '[]' || trimmed === '{}' || trimmed === 'null') {
        return true;
      }
      return false;
    }
    if (Array.isArray(value)) {
      return value.length === 0;
    }
    return false;
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
