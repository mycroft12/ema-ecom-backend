import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { Observable, catchError, of, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ProductSchema, SchemaConfigurationRequest, TemplateValidationResult, ColumnDefinition } from '../models/product-schema.model';
import { AuthService } from '../../../core/auth.service';

@Injectable({ providedIn: 'root' })
export class ProductSchemaService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = environment.apiBase;
  private readonly auth = inject(AuthService);

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

  loadSchema(): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    // First check if the product_config table exists by querying the tables endpoint
    this.http.get<any[]>(`${this.apiBase}/api/import/configure/tables`).pipe(
      tap(tables => {
        // Check if product_config is in the list of tables
        const productConfigExists = tables.some(table => table.tableName === 'product_config');

        if (productConfigExists) {
          // If the table exists, proceed with loading the schema
          this.loadSchemaFromProductsEndpoint();
        } else {
          // If the table doesn't exist, set schema to null and stop loading
          this.schemaSignal.set(null);
          this.loadingSignal.set(false);
        }
      }),
      catchError(err => {
        // If there's an error checking tables, assume not configured
        this.schemaSignal.set(null);
        this.loadingSignal.set(false);
        return of(null);
      })
    ).subscribe();
  }

  /**
   * Helper method to load schema by probing the products endpoint.
   * Only called if we've confirmed the product_config table exists.
   */
  private loadSchemaFromProductsEndpoint(): void {
    this.http.get<any>(`${this.apiBase}/api/products`, {
      params: { includeSchema: true, page: 0, size: 1 } as any
    }).pipe(
        tap(resp => {
          const columns = resp?.columns ?? [];
          const filteredColumns = this.filterColumnsByPermission(columns);
          this.schemaSignal.set({
            id: 0,
            tableName: 'product_config',
            displayName: 'Products',
            domain: 'products',
            version: 1,
            status: 'ACTIVE',
            columns: filteredColumns,
            createdAt: new Date()
          } as unknown as ProductSchema);
          this.loadingSignal.set(false);
        }),
        catchError(err => {
          this.schemaSignal.set(null);
          this.loadingSignal.set(false);
          return of(null);
        })
    ).subscribe();
  }


  uploadTemplate(request: SchemaConfigurationRequest): Observable<HttpEvent<any>> {
    const formData = new FormData();
    formData.append('domain', 'product');
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
    const headers = ['name','sku','price','quantity'];
    const types = ['TEXT','TEXT','DECIMAL','INTEGER'];
    const csv = headers.join(',') + '\n' + types.join(',') + '\n';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    this.downloadFile(blob, 'product-template.csv');
  }

  generateTemplateWithTypes(): void {
    const allTypes = ['TEXT','INTEGER','DECIMAL','DATE','BOOLEAN','MINIO_IMAGE','MINIO_FILE'];
    const headers = allTypes.map((t, i) => `col_${i+1}`);
    const csv = headers.join(',') + '\n' + allTypes.join(',') + '\n';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    this.downloadFile(blob, 'product-template-with-types.csv');
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
    const prefix = 'product:access:';
    const relevant = Array.from(perms).filter(p => p.startsWith(prefix));
    if (relevant.length === 0) {
      return [];
    }
    return columns.filter(col => {
      if (!col?.name) {
        return true;
      }
      const required = prefix + col.name;
      return perms.has(required);
    });
  }
}
