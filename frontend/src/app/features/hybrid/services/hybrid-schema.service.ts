import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { Observable, catchError, of, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  HybridTableSchema,
  HybridSchemaConfigurationRequest,
  HybridTemplateValidationResult,
  HybridColumnDefinition,
  HybridColumnType,
  HybridMediaConstraints
} from '../models/hybrid-entity.model';
import { AuthService } from '../../../core/auth.service';
import { TranslateService } from '@ngx-translate/core';

interface HybridContext {
  entityType: string;
  translationPrefix: string;
  displayName: string;
}

@Injectable({ providedIn: 'root' })
export class HybridSchemaService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = environment.apiBase;
  private readonly auth = inject(AuthService);
  private readonly translate = inject(TranslateService);

  private readonly contextSignal = signal<HybridContext>({
    entityType: 'product',
    translationPrefix: 'products',
    displayName: 'Products'
  });

  private readonly schemaSignal = signal<HybridTableSchema | null>(null);
  private readonly loadingSignal = signal<boolean>(false);
  private readonly errorSignal = signal<string | null>(null);
  private readonly uploadProgressSignal = signal<number>(0);
  private readonly columnOrderStoragePrefix = 'ema.hybrid.columnOrder.';

  readonly schema = this.schemaSignal.asReadonly();
  readonly isLoading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly uploadProgress = this.uploadProgressSignal.asReadonly();
  readonly isConfigured = computed(() => this.schemaSignal() !== null && this.schemaSignal()!.status === 'ACTIVE');
  readonly columns = computed(() => this.schemaSignal()?.columns ?? []);
  readonly visibleColumns = computed(() => this.columns().filter(c => !c.hidden).sort((a, b) => a.displayOrder - b.displayOrder));
  readonly displayName = computed(() => this.schemaSignal()?.displayName ?? this.contextSignal().displayName);

  get entityTypeName(): string {
    return this.contextSignal().entityType;
  }

  get translationNamespace(): string {
    return this.contextSignal().translationPrefix;
  }

  configureContext(context: Partial<HybridContext>): void {
    const current = this.contextSignal();
    const nextEntity = this.normalizeEntity(context.entityType ?? current.entityType);
    const nextTranslation = this.normalizeTranslationPrefix(context.translationPrefix ?? current.translationPrefix, nextEntity);
    const nextDisplayName = this.normalizeDisplayName(context.displayName ?? current.displayName, nextEntity);

    if (current.entityType === nextEntity &&
        current.translationPrefix === nextTranslation &&
        current.displayName === nextDisplayName) {
      return;
    }
    this.contextSignal.set({
      entityType: nextEntity,
      translationPrefix: nextTranslation,
      displayName: nextDisplayName
    });
    this.schemaSignal.set(null);
    this.errorSignal.set(null);
  }

  loadSchema(): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.fetchSchema();
  }

  private fetchSchema(): void {
    const context = this.contextSignal();
    const entityType = context.entityType;

    this.http.get<any>(`${this.apiBase}/api/hybrid/${entityType}`, {
      params: { includeSchema: true, page: 0, size: 1 } as any
    }).pipe(
      tap(resp => {
        const columns = resp?.columns ?? [];
        const filteredColumns = this.filterColumnsByPermission(columns).map(col => this.normalizeColumnDefinition(col));
        if (this.contextSignal().entityType !== entityType) {
          return;
        }
        this.schemaSignal.set({
          id: 0,
          tableName: `${entityType}_config`,
          displayName: context.displayName,
          domain: entityType,
          version: 1,
          status: 'ACTIVE',
          columns: filteredColumns,
          createdAt: new Date()
        } as unknown as HybridTableSchema);
        this.applyColumnOrder();
        this.loadingSignal.set(false);
      }),
      catchError(err => {
        const status = Number((err && (err.status ?? err['status'])) ?? 0);
        const rawMessage = (err && (err.error?.message || err.message || '')) as string;
        const normalizedMessage = (rawMessage || '').toLowerCase();
        const notConfigured = status === 404 || normalizedMessage.includes('not configure');

        this.schemaSignal.set(null);

        if (notConfigured) {
          this.errorSignal.set(null);
        } else if (status === 0) {
          this.errorSignal.set(this.translate.instant(`${this.translationNamespace}.errors.backend`));
        } else {
          this.errorSignal.set(rawMessage || this.translate.instant(`${this.translationNamespace}.errors.backend`));
        }
        this.loadingSignal.set(false);
        return of(null);
      })
    ).subscribe();
  }

  uploadTemplate(request: HybridSchemaConfigurationRequest): Observable<HttpEvent<any>> {
    const formData = new FormData();
    formData.append('domain', this.entityTypeName);
    formData.append('file', request.file);
    formData.append('displayName', request.displayName);
    formData.append('validateBeforeApply', String(request.validateBeforeApply));

    this.uploadProgressSignal.set(0);

    return this.http.post<any>(`${this.apiBase}/api/import/configure`, formData, { observe: 'events', reportProgress: true }).pipe(
      tap(event => {
        if (event.type === HttpEventType.UploadProgress) {
          const total = (event as any).total || 0;
          const loaded = (event as any).loaded || 0;
          const progress = total ? Math.round((100 * loaded) / total) : 0;
          this.uploadProgressSignal.set(progress);
        }
        if (event.type === HttpEventType.Response) {
          this.uploadProgressSignal.set(100);
          setTimeout(() => this.loadSchema(), 750);
        }
      })
    );
  }

  validateTemplate(_file: File): Observable<HybridTemplateValidationResult> {
    return of({ valid: true, errors: [], warnings: [] });
  }

  downloadTemplate(): void {
    const entity = this.entityTypeName;
    const headers = ['name', 'sku', 'price', 'quantity'];
    const types = ['TEXT', 'TEXT', 'DECIMAL', 'INTEGER'];
    const csv = headers.join(',') + '\n' + types.join(',') + '\n';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    this.saveBlob(blob, `${entity}-template.csv`);
  }

  generateTemplateWithTypes(): void {
    const entity = this.entityTypeName;
    const allTypes = ['TEXT', 'INTEGER', 'DECIMAL', 'DATE', 'BOOLEAN', 'MINIO_IMAGE', 'MINIO_FILE'];
    const headers = allTypes.map((t, i) => `col_${i + 1}`);
    const csv = headers.join(',') + '\n' + allTypes.join(',') + '\n';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    this.saveBlob(blob, `${entity}-template-with-types.csv`);
  }

  reorderColumns(columnNames: string[]): Observable<void> {
    const normalized = this.normalizeColumnOrder(columnNames);
    const entity = this.entityTypeName;
    this.persistColumnOrder(entity, normalized);
    return of(void 0);
  }

  applyColumnOrder(columnNames?: string[]): void {
    const schema = this.schemaSignal();
    if (!schema || !schema.columns?.length) {
      return;
    }
    const normalizedOrder = this.normalizeColumnOrder(
      columnNames && columnNames.length ? columnNames : this.loadStoredColumnOrder(schema.domain || this.entityTypeName)
    );
    if (!normalizedOrder.length) {
      const sorted = [...schema.columns].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
      this.schemaSignal.set({ ...schema, columns: sorted });
      return;
    }
    const columnLookup = schema.columns.reduce<Record<string, HybridColumnDefinition>>((acc, column) => {
      acc[column.name] = column;
      return acc;
    }, {});
    const orderSet = new Set(normalizedOrder);
    const orderedColumns: HybridColumnDefinition[] = normalizedOrder
      .map(name => columnLookup[name])
      .filter((column): column is HybridColumnDefinition => !!column)
      .map(column => ({ ...column }));
    const remainingColumns = schema.columns
      .filter(column => !orderSet.has(column.name))
      .map(column => ({ ...column }))
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
    const nextColumns = [...orderedColumns, ...remainingColumns].map((column, index) => ({
      ...column,
      displayOrder: index + 1
    }));
    this.schemaSignal.set({ ...schema, columns: nextColumns });
  }

  private saveBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  private filterColumnsByPermission(columns: HybridColumnDefinition[]): HybridColumnDefinition[] {
    const normalizedPerms = new Set((this.auth.permissions() ?? []).map(p => p.toLowerCase()));
    const entity = this.entityTypeName.toLowerCase();
    const prefix = `${entity}:access:`;
    const hasWildcard = Array.from(normalizedPerms).some(p => p.startsWith(`${entity}:*`));
    const hasDomainRead = normalizedPerms.has(`${entity}:read`);
    if (hasWildcard) {
      return columns;
    }
    const filtered = columns.filter(col => {
      if (!col?.name) {
        return true;
      }
      const required = (prefix + col.name).toLowerCase();
      if (normalizedPerms.has(required)) {
        return true;
      }
      const meta = (col.metadata ?? {}) as Record<string, any>;
      if (hasDomainRead && (meta['readOnly'] === true || meta['readonly'] === true || meta['disabled'] === true)) {
        return true;
      }
      return false;
    });
    if (filtered.length > 0) {
      return filtered;
    }
    if (normalizedPerms.has(`${entity}:read`)) {
      return columns;
    }
    return filtered;
  }

  private normalizeColumnDefinition(column: HybridColumnDefinition): HybridColumnDefinition {
    const type = this.normalizeType((column as any)?.type);
    const rawMetadata = this.cloneMetadata((column as any)?.metadata);
    const semanticType = (column as any)?.semanticType ?? rawMetadata?.['semanticType'];
    const mediaConstraints = this.buildMediaConstraints(rawMetadata, type);
    const normalized = {
      ...column,
      type,
      metadata: rawMetadata,
      semanticType,
      mediaConstraints
    } as HybridColumnDefinition;
    return this.applyColumnOverrides(normalized);
  }

  private normalizeType(input: HybridColumnDefinition['type']): HybridColumnType {
    const normalized = (input ?? '').toString().trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_');
    switch (normalized) {
      case 'INTEGER':
        return HybridColumnType.INTEGER;
      case 'DECIMAL':
        return HybridColumnType.DECIMAL;
      case 'DATE':
        return HybridColumnType.DATE;
      case 'BOOLEAN':
        return HybridColumnType.BOOLEAN;
      case 'MINIO_IMAGE':
      case 'MINIO__IMAGE':
      case 'MINIO_IMAGE_':
      case 'MINIO_IMAGE__':
      case 'MINIO_IMAGE___':
        return HybridColumnType.MINIO_IMAGE;
      case 'MINIO_FILE':
      case 'MINIO__FILE':
      case 'MINIO_FILE_':
        return HybridColumnType.MINIO_FILE;
      case 'TEXT':
      default:
        return HybridColumnType.TEXT;
    }
  }

  private buildMediaConstraints(metadata: Record<string, any> | undefined, type: HybridColumnType): HybridMediaConstraints | undefined {
    if (type !== HybridColumnType.MINIO_IMAGE) {
      return undefined;
    }
    const maxImages = this.parseNumber(metadata?.['maxImages'], 1);
    const maxFileSizeBytes = this.parseNumber(metadata?.['maxFileSizeBytes'], 5 * 1024 * 1024);
    const allowed = this.normalizeStringArray(metadata?.['allowedMimeTypes']);
    return {
      maxImages,
      maxFileSizeBytes,
      allowedMimeTypes: allowed.length ? allowed : undefined
    };
  }

  private normalizeStringArray(value: any): string[] {
    if (!value) {
      return [];
    }
    if (Array.isArray(value)) {
      return value.map(v => String(v)).filter(Boolean);
    }
    if (typeof value === 'string') {
      return value.split(',').map(v => v.trim()).filter(Boolean);
    }
    return [];
  }

  private parseNumber(value: any, fallback: number): number {
    if (value === null || value === undefined) {
      return fallback;
    }
    const num = Number(value);
    return Number.isFinite(num) && num > 0 ? num : fallback;
  }

  private cloneMetadata(metadata: any): Record<string, any> | undefined {
    if (!metadata || typeof metadata !== 'object') {
      return undefined;
    }
    try {
      return JSON.parse(JSON.stringify(metadata));
    } catch {
      return { ...metadata };
    }
  }

  private normalizeEntity(value: string | null | undefined): string {
    const normalized = (value ?? '').toString().trim().toLowerCase();
    return normalized || 'product';
  }

  private normalizeTranslationPrefix(value: string | null | undefined, entity: string): string {
    const normalized = (value ?? '').toString().trim();
    if (normalized) {
      return normalized;
    }
    return entity === 'product' ? 'products' : entity;
  }

  private normalizeDisplayName(value: string | null | undefined, entity: string): string {
    const normalized = (value ?? '').toString().trim();
    if (normalized) {
      return normalized;
    }
    if (entity === 'product') {
      return 'Products';
    }
    return entity.replace(/[-_]/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
  }

  private applyColumnOverrides(column: HybridColumnDefinition): HybridColumnDefinition {
    const entity = (this.contextSignal().entityType ?? '').toLowerCase();
    if (entity !== 'ads') {
      return column;
    }
    if (column.name === 'campaign_name') {
      return { ...column, displayName: 'AD Account Name' };
    }
    if (column.name === 'ad_spend') {
      return { ...column, displayName: 'Ad Spend ($)' };
    }
    if (column.name === 'confirmed_orders') {
      return { ...column, displayName: 'Leads' };
    }
    if (column.name === 'delivered_orders') {
      return { ...column, hidden: true };
    }
    return column;
  }

  private normalizeColumnOrder(order: string[] | null | undefined): string[] {
    if (!order || !order.length) {
      return [];
    }
    const seen = new Set<string>();
    return order
      .map(name => (name ?? '').toString().trim())
      .filter(name => {
        if (!name || seen.has(name)) {
          return false;
        }
        seen.add(name);
        return true;
      });
  }

  private persistColumnOrder(entity: string, order: string[]): void {
    const storage = this.resolveStorage();
    if (!storage) {
      return;
    }
    const key = this.columnOrderStorageKey(entity);
    if (!order.length) {
      storage.removeItem(key);
      return;
    }
    try {
      storage.setItem(key, JSON.stringify(order));
    } catch {
      // ignore persistence errors
    }
  }

  private loadStoredColumnOrder(entity: string): string[] {
    const storage = this.resolveStorage();
    if (!storage) {
      return [];
    }
    const key = this.columnOrderStorageKey(entity);
    try {
      const raw = storage.getItem(key);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? this.normalizeColumnOrder(parsed) : [];
    } catch {
      return [];
    }
  }

  private columnOrderStorageKey(entity: string): string {
    return `${this.columnOrderStoragePrefix}${(entity ?? '').toLowerCase()}`;
  }

  private resolveStorage(): Storage | null {
    try {
      if (typeof window === 'undefined' || !window?.localStorage) {
        return null;
      }
      return window.localStorage;
    } catch {
      return null;
    }
  }
}
