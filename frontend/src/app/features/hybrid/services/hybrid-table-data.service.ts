import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { HybridEntityRecord, HybridPageResponse, HybridRawEntityDto } from '../models/hybrid-entity.model';
import { TableLazyLoadEvent } from '../models/filter.model';
import { HybridSchemaService } from './hybrid-schema.service';

export interface HybridMinioUploadResponse {
  key: string;
  url: string;
  expiresAt?: string;
  contentType?: string;
  sizeBytes?: number;
}

@Injectable({ providedIn: 'root' })
export class HybridTableDataService {
  private readonly http = inject(HttpClient);
  private readonly schemaService = inject(HybridSchemaService);

  private readonly recordsSignal = signal<HybridEntityRecord[]>([]);
  private readonly totalRecordsSignal = signal<number>(0);
  private readonly loadingSignal = signal<boolean>(false);
  private activeEntityType = 'product';

  readonly records = this.recordsSignal.asReadonly();
  readonly totalRecords = this.totalRecordsSignal.asReadonly();
  readonly isLoading = this.loadingSignal.asReadonly();

  setEntityContext(entity: string | null | undefined): void {
    const normalized = this.normalizeEntity(entity);
    if (normalized === this.activeEntityType) {
      return;
    }
    this.activeEntityType = normalized;
    this.resetState();
  }

  loadRecords(event: TableLazyLoadEvent, ordersView?: 'new' | 'done' | null): Observable<HybridPageResponse> {
    const entity = this.ensureEntityContext();
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

    if (ordersView && entity === 'orders') {
      params = params.set('ordersView', ordersView);
    }

    if (event.filters) {
      Object.entries(event.filters).forEach(([key, metadata]) => {
        const detail = this.extractFilterDetail(metadata);
        if (detail && !this.isEmptyFilterValue(detail.value)) {
          params = params.set(`filter.${key}`, detail.value);
          if (detail.matchMode) {
            params = params.set(`filter.${key}.matchMode`, detail.matchMode);
          }
          if (detail.type) {
            params = params.set(`filter.${key}.type`, detail.type);
          }
        }
      });
    }

    return this.http.get<HybridPageResponse>(this.apiUrlFor(entity), { params }).pipe(
      tap(resp => {
        const flattened = (resp.content ?? []).map(item => this.flattenRecord(item));
        this.recordsSignal.set(flattened);
        this.totalRecordsSignal.set(resp.totalElements);
        this.loadingSignal.set(false);
      })
    );
  }

  getRecord(id: string): Observable<HybridEntityRecord> {
    const entity = this.ensureEntityContext();
    return this.http.get<HybridRawEntityDto>(`${this.apiUrlFor(entity)}/${id}`).pipe(
      map(dto => this.flattenRecord(dto))
    );
  }

  createRecord(attributes: Record<string, any>): Observable<HybridEntityRecord> {
    const entity = this.ensureEntityContext();
    return this.http.post<HybridRawEntityDto>(this.apiUrlFor(entity), { attributes }).pipe(
      map(dto => this.flattenRecord(dto))
    );
  }

  updateRecord(id: string, attributes: Record<string, any>): Observable<HybridEntityRecord> {
    const entity = this.ensureEntityContext();
    return this.http.put<HybridRawEntityDto>(`${this.apiUrlFor(entity)}/${id}`, { attributes }).pipe(
      map(dto => this.flattenRecord(dto))
    );
  }

  uploadImage(field: string, file: File): Observable<HybridMinioUploadResponse> {
    const entity = this.ensureEntityContext();
    const formData = new FormData();
    formData.append('file', file);
    let params = new HttpParams()
      .set('domain', entity)
      .set('field', field);
    return this.http.post<HybridMinioUploadResponse>(`${environment.apiBase}/api/files/upload`, formData, { params });
  }

  deleteRecord(id: string): Observable<void> {
    const entity = this.ensureEntityContext();
    return this.http.delete<void>(`${this.apiUrlFor(entity)}/${id}`);
  }

  bulkDelete(ids: string[]): Observable<void> {
    return new Observable<void>(observer => {
      const perform = async () => {
        const entity = this.ensureEntityContext();
        const baseUrl = this.apiUrlFor(entity);
        for (const id of ids) {
          await this.http.delete<void>(`${baseUrl}/${id}`).toPromise().catch(() => {/* ignore */});
        }
        observer.next();
        observer.complete();
      };
      perform();
    });
  }

  exportToExcel(): void {
    const entity = this.ensureEntityContext();
    const rows = this.records();
    if (!rows || !rows.length) {
      return;
    }
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(',')]
      .concat(rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(',')))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    this.download(blob, `${entity}-export-${new Date().getTime()}.csv`);
  }

  private flattenRecord(dto: HybridRawEntityDto | null | undefined): HybridEntityRecord {
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

  private extractFilterDetail(metadata: any): { value: string; matchMode?: string; type?: string } | null {
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
      return { value: serialized, matchMode: metadata.matchMode, type: metadata.type };
    }
    if (Array.isArray(metadata.constraints)) {
      for (const constraint of metadata.constraints) {
        const detail = this.extractFilterDetail(constraint);
        if (detail) {
          return {
            value: detail.value,
            matchMode: detail.matchMode ?? metadata.matchMode,
            type: detail.type ?? metadata.type
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

  private ensureEntityContext(): string {
    const entity = this.normalizeEntity(this.schemaService.entityTypeName);
    if (entity !== this.activeEntityType) {
      this.activeEntityType = entity;
      this.resetState();
    }
    return this.activeEntityType;
  }

  private apiUrlFor(entity: string): string {
    return `${environment.apiBase}/api/hybrid/${entity}`;
  }

  private download(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  private resetState(): void {
    this.recordsSignal.set([]);
    this.totalRecordsSignal.set(0);
    this.loadingSignal.set(false);
  }

  private normalizeEntity(value: string | null | undefined): string {
    const normalized = (value ?? '').toString().trim().toLowerCase();
    return normalized || 'product';
  }
}
