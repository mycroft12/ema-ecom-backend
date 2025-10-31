import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { Observable, catchError, of, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ProductSchema, SchemaConfigurationRequest, TemplateValidationResult, ColumnDefinition, ColumnType } from '../models/product-schema.model';
import { AuthService } from '../../../core/auth.service';
import { TranslateService } from '@ngx-translate/core';

interface HybridContext {
  entityType: string;
  translationPrefix: string;
  displayName: string;
}

@Injectable({ providedIn: 'root' })
export class ProductSchemaService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = environment.apiBase;
  private readonly auth = inject(AuthService);
  private readonly translate = inject(TranslateService);

  private readonly contextSignal = signal<HybridContext>({
    entityType: 'product',
    translationPrefix: 'products',
    displayName: 'Products'
  });

  private readonly schemaSignal = signal<ProductSchema | null>(null);
  private readonly loadingSignal = signal<boolean>(false);
  private readonly errorSignal = signal<string | null>(null);
  private readonly uploadProgressSignal = signal<number>(0);

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
    this.loadSchemaFromEndpoint();
  }

  /**
   * Helper method to load schema by probing the hybrid endpoint.
   */
  private loadSchemaFromEndpoint(): void {
    const context = this.contextSignal();
    const entityType = context.entityType;

    this.http.get<any>(`${this.apiBase}/api/hybrid/${entityType}`, {
      params: { includeSchema: true, page: 0, size: 1 } as any
    }).pipe(
        tap(resp => {
          const columns = resp?.columns ?? [];
          const filteredColumns = this.filterColumnsByPermission(columns).map(col => this.normalizeColumnDefinition(col));
          if (this.contextSignal().entityType !== entityType) {
            // Context changed while the request was in flight
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
          } as unknown as ProductSchema);
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


  uploadTemplate(request: SchemaConfigurationRequest): Observable<HttpEvent<any>> {
    const formData = new FormData();
    formData.append('domain', this.entityTypeName);
    formData.append('file', request.file);
    // Extra fields are ignored by backend for now
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

  validateTemplate(file: File): Observable<TemplateValidationResult> {
    // Placeholder client-side response; backend validation endpoint not available yet
    return of({ valid: true, errors: [], warnings: [] });
  }

  downloadTemplate(): void {
    // Generate a simple CSV template client-side: first row headers, second row types
    const entity = this.entityTypeName;
    const headers = ['name','sku','price','quantity'];
    const types = ['TEXT','TEXT','DECIMAL','INTEGER'];
    const csv = headers.join(',') + '\n' + types.join(',') + '\n';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    this.downloadFile(blob, `${entity}-template.csv`);
  }

  generateTemplateWithTypes(): void {
    const entity = this.entityTypeName;
    const allTypes = ['TEXT','INTEGER','DECIMAL','DATE','BOOLEAN','MINIO_IMAGE','MINIO_FILE'];
    const headers = allTypes.map((t, i) => `col_${i+1}`);
    const csv = headers.join(',') + '\n' + allTypes.join(',') + '\n';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    this.downloadFile(blob, `${entity}-template-with-types.csv`);
  }

  private extractFilename(cd: string | null): string | null {
    if (!cd) return null;
    const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(cd);
    // @ts-ignore index access
    return matches && matches[1] ? matches[1].replace(/['"]/g, '') : null;
  }

  private downloadFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  private filterColumnsByPermission(columns: ColumnDefinition[]): ColumnDefinition[] {
    const perms = new Set(this.auth.permissions() ?? []);
    const entity = this.entityTypeName;
    const prefix = `${entity}:access:`;
    const hasWildcard = Array.from(perms).some(p => p.startsWith(`${entity}:*`));
    const relevant = Array.from(perms).filter(p => p.startsWith(prefix));
    if (hasWildcard) {
      return columns;
    }
    if (relevant.length === 0) {
      const hasBaseEntityPermission = Array.from(perms).some(p => p.startsWith(`${entity}:`));
      if (!perms.size || hasBaseEntityPermission) {
        return columns;
      }
      return columns;
    }
    return columns.filter(col => {
      if (!col?.name) {
        return true;
      }
      const required = prefix + col.name;
      return perms.has(required);
    });
  }

  private normalizeColumnDefinition(column: ColumnDefinition): ColumnDefinition {
    const type = this.normalizeType((column as any)?.type);
    const rawMetadata = this.cloneMetadata((column as any)?.metadata);
    const semanticType = (column as any)?.semanticType ?? rawMetadata?.['semanticType'];
    const mediaConstraints = this.buildMediaConstraints(rawMetadata, type);
    return {
      ...column,
      type,
      metadata: rawMetadata,
      semanticType,
      mediaConstraints
    } as ColumnDefinition;
  }

  private normalizeType(type: ColumnDefinition['type']): ColumnType {
    const normalized = (type ?? '').toString().trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_');
    switch (normalized) {
      case 'INTEGER':
        return ColumnType.INTEGER;
      case 'DECIMAL':
        return ColumnType.DECIMAL;
      case 'DATE':
        return ColumnType.DATE;
      case 'BOOLEAN':
        return ColumnType.BOOLEAN;
      case 'MINIO_IMAGE':
      case 'MINIO__IMAGE':
      case 'MINIO_IMAGE_':
      case 'MINIO_IMAGE__':
      case 'MINIO_IMAGE___':
        return ColumnType.MINIO_IMAGE;
      case 'MINIO_FILE':
      case 'MINIO__FILE':
      case 'MINIO_FILE_':
        return ColumnType.MINIO_FILE;
      case 'TEXT':
      default:
        return ColumnType.TEXT;
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
    return entity.replace(/[-_]/g, ' ').replace(/\b\w/g, (match) => match.toUpperCase());
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

  private buildMediaConstraints(metadata: Record<string, any> | undefined, type: ColumnType): { maxImages: number; maxFileSizeBytes?: number; allowedMimeTypes?: string[] } | undefined {
    if (type !== ColumnType.MINIO_IMAGE) {
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
}
