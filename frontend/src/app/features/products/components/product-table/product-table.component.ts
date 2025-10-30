import { Component, OnDestroy, OnInit, ViewChild, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MessageService, ConfirmationService } from 'primeng/api';
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { ProgressBarModule } from 'primeng/progressbar';
import { TagModule } from 'primeng/tag';
import { SliderModule } from 'primeng/slider';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ImageModule } from 'primeng/image';

import { ProductDataService, MinioUploadResponse } from '../../services/product-data.service';
import { ProductSchemaService } from '../../services/product-schema.service';
import { ColumnDefinition, ColumnType, MinioImageItem, MinioImageValue } from '../../models/product-schema.model';
import { TableLazyLoadEvent } from '../../models/filter.model';
import { AuthService } from '../../../../core/auth.service';
import { Subject } from 'rxjs';
import { finalize, switchMap, takeUntil } from 'rxjs/operators';
import { ProductBadgeService, ProductUpsertEvent } from '../../services/product-badge.service';

const DEFAULT_MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MiB

@Component({
  selector: 'app-product-table',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    TableModule,
    ButtonModule,
    ToastModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    MultiSelectModule,
    SelectModule,
    ProgressBarModule,
    TagModule,
    SliderModule,
    DialogModule,
    ConfirmDialogModule,
    ImageModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './product-table.component.html',
  styleUrls: ['./product-table.component.scss']
})
export class ProductTableComponent implements OnInit, OnDestroy {
  @ViewChild('dt1') dt1!: Table;

  readonly dataService = inject(ProductDataService);
  readonly schemaService = inject(ProductSchemaService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  readonly translate = inject(TranslateService);
  private readonly auth = inject(AuthService);
  private readonly productBadge = inject(ProductBadgeService);
  private readonly imageUploadBusy: Record<string, boolean> = {};

  ColumnType = ColumnType; // expose enum to template

  loading = false;
  searchValue?: string;
  globalFilterFields: string[] = [];
  rows = 10;
  totalRecords = 0;
  first = 0;
  sortField?: string;
  sortOrder: number = 1;
  columnToggleOptions: Array<{ label: string; value: string }> = [];
  selectedColumnKeys: string[] = [];
  columnToggleSelectedItemsLabel = '';
  dialogStyle = { width: 'clamp(550px, 70vw, 1040px)' };

  private readonly destroy$ = new Subject<void>();
  private lastLazyLoadEvent: TableLazyLoadEvent | null = null;
  private readonly realtimeEffectRef = effect(() => {
    const realtimeEvent = this.productBadge.upsertEvents()();
    if (realtimeEvent) {
      this.handleRealtimeUpdate(realtimeEvent);
    }
  });

  // “example-like” filter models + options
  representativeOptions: Array<{ name: string; image: string }> = [];
  statusOptions: Array<{ label: string; value: string }> = [];
  repFilterModel: any[] = [];
  statusFilterModel?: string;

  // activity range (between)
  activityMin = 0;
  activityMax = 100;
  activityRange: [number, number] = [0, 100];

  private readonly productPermissionKeys = {
    create: 'product:create',
    update: 'product:update',
    delete: 'product:delete',
    export: 'product:action:export:excel'
  } as const;
  private permissionsState = { add: false, edit: false, delete: false, export: false };

  displayDialog = false;
  dialogMode: 'create' | 'edit' = 'create';
  formModel: Record<string, any> = {};
  editingProductId: string | null = null;
  saving = false;
  formSubmitted = false;

  get canAdd(): boolean { return this.permissionsState.add; }
  get canEdit(): boolean { return this.permissionsState.edit; }
  get canDelete(): boolean { return this.permissionsState.delete; }
  get canExport(): boolean { return this.permissionsState.export; }
  get showActionColumn(): boolean { return this.canEdit || this.canDelete; }
  get dialogHeader(): string {
    return this.dialogMode === 'create'
      ? this.translate.instant('products.newProduct')
      : this.translate.instant('products.editProduct');
  }
  get submitLabel(): string {
    return this.translate.instant('common.save');
  }
  trackColumn = (_: number, column: ColumnDefinition) => column.name;

  ngOnInit() {
    this.loading = true;
    this.refreshActionPermissions();
    // 1) build globalFilterFields from dynamic schema
    this.updateGlobalFilterFields();
    this.updateColumnToggleSelectedLabel();
    this.translate.onLangChange.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.updateColumnToggleSelectedLabel();
      this.syncColumnToggleOptions();
    });

    // 2) load data (keeps your service flow)
    this.loadData({
      first: this.first,
      rows: this.rows,
      sortField: undefined,
      sortOrder: undefined,
      filters: undefined,
      globalFilter: undefined
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.realtimeEffectRef.destroy();
  }

  onLazyLoad(event: TableLazyLoadEvent) {
    this.rows = event.rows ?? this.rows;
    this.first = event.first ?? 0;
    this.loadData(event);
  }

  private loadData(event: TableLazyLoadEvent) {
    this.lastLazyLoadEvent = { ...event };
    this.loading = true;
    this.updateGlobalFilterFields();
    if (event.globalFilter !== undefined) {
      this.searchValue = event.globalFilter ?? '';
    }
    this.sortField = event.sortField ?? this.sortField;
    this.sortOrder = event.sortOrder ?? this.sortOrder;

    this.dataService.loadProducts({
      ...event,
      sortField: this.sortField,
      sortOrder: this.sortOrder
    }).subscribe({
      next: resp => {
        this.totalRecords = resp.totalElements ?? 0;
        // 3) once data is in memory, derive example-like options dynamically
        const rows = this.dataService.products() ?? [];

        // representative options (if column exists)
        const repCol = this.schemaService.visibleColumns().find(c => this.isRepresentative(c));
        if (repCol) {
          const uniqKey = new Set<string>();
          this.representativeOptions = rows
              .map(r => r?.[repCol.name])
              .filter(v => !!v && typeof v === 'object')
              .filter(rep => {
                const key = `${rep.name}|${rep.image}`;
                if (uniqKey.has(key)) return false;
                uniqKey.add(key);
                return true;
              });
        }

        // status options (if column exists)
        const statusCol = this.schemaService.visibleColumns().find(c => this.isStatus(c));
        if (statusCol) {
          const uniq = Array.from(new Set(rows.map(r => r?.[statusCol.name]).filter(Boolean)));
          this.statusOptions = uniq.map(v => ({ label: String(v), value: String(v) }));
        }

        // activity range (if column exists)
        const activityCol = this.schemaService.visibleColumns().find(c => this.isActivity(c));
        if (activityCol) {
          const values = rows.map(r => Number(r?.[activityCol.name])).filter(n => !isNaN(n));
          if (values.length) {
            this.activityMin = Math.min(...values);
            this.activityMax = Math.max(...values);
            this.activityRange = [this.activityMin, this.activityMax];
          }
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  private handleRealtimeUpdate(event: ProductUpsertEvent): void {
    if (!this.lastLazyLoadEvent) {
      return;
    }
    console.debug('[ProductTable] Realtime upsert detected', event);
    this.loadData({ ...this.lastLazyLoadEvent });
  }

  onSort(event: { field: string; order: number }): void {
    this.sortField = event.field;
    this.sortOrder = event.order;
  }

  private refreshActionPermissions(): void {
    const permissions = new Set(this.auth.permissions() ?? []);
    this.permissionsState = {
      add: permissions.has(this.productPermissionKeys.create),
      edit: permissions.has(this.productPermissionKeys.update),
      delete: permissions.has(this.productPermissionKeys.delete),
      export: permissions.has(this.productPermissionKeys.export)
    };
  }

  onGlobalFilter(event: Event, table: Table): void {
    const value = (event.target as HTMLInputElement)?.value ?? '';
    this.searchValue = value;
    table.filterGlobal(value, 'contains');
  }

  openCreateDialog(): void {
    if (!this.canAdd) {
      return;
    }
    this.dialogMode = 'create';
    this.editingProductId = null;
    this.formModel = this.buildInitialFormModel();
    this.formSubmitted = false;
    this.displayDialog = true;
  }

  onExportExcel(): void {
    this.dataService.exportToExcel();
  }

  openEditDialog(productId: string): void {
    if (!this.canEdit || !productId) {
      return;
    }
    this.dialogMode = 'edit';
    this.editingProductId = productId;
    this.formModel = this.buildInitialFormModel();
    this.formSubmitted = false;
    this.displayDialog = true;
    this.dataService.getProduct(productId).subscribe({
      next: product => {
        this.formModel = this.buildInitialFormModel(product);
      },
      error: () => {
        this.displayDialog = false;
        this.showError(this.translate.instant('products.errors.loadOne'));
      }
    });
  }

  saveProduct(form: NgForm): void {
    this.formSubmitted = true;
    if (form.invalid) {
      return;
    }
    const attributes = this.collectAttributesFromFormModel();
    this.saving = true;
    const request$ = this.dialogMode === 'create'
      ? this.dataService.createProduct(attributes)
      : this.dataService.updateProduct(this.editingProductId!, attributes);

    request$.subscribe({
      next: () => {
        this.saving = false;
        this.showSuccess(this.translate.instant(
          this.dialogMode === 'create' ? 'products.toastCreated' : 'products.toastUpdated'
        ));
        this.closeDialog();
        this.reloadTable();
      },
      error: () => {
        this.saving = false;
        this.showError(this.translate.instant(
          this.dialogMode === 'create' ? 'products.errors.create' : 'products.errors.update'
        ));
      }
    });
  }

  closeDialog(): void {
    this.displayDialog = false;
    this.formSubmitted = false;
    this.saving = false;
    this.editingProductId = null;
  }

  confirmDeleteProduct(productId: string): void {
    if (!this.canDelete || !productId) {
      return;
    }
    const header = this.translate.instant('products.confirmDeleteHeader');
    const message = this.translate.instant('products.confirmDeleteMessage');
    this.confirmationService.confirm({
      header,
      message,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.translate.instant('common.yes'),
      rejectLabel: this.translate.instant('common.cancel'),
      accept: () => this.deleteProduct(productId)
    });
  }

  private deleteProduct(productId: string): void {
    this.dataService.deleteProduct(productId).subscribe({
      next: () => {
        this.resetFiltersAndState();
        this.showSuccess(this.translate.instant('products.toastDeleted'));
        this.reloadTable();
      },
      error: () => this.showError(this.translate.instant('products.errors.delete'))
    });
  }

  updateGlobalFilterFields() {
    const columns = this.schemaService.visibleColumns();
    this.globalFilterFields = columns.map(c => c.name);
    this.syncColumnToggleOptions(columns);
  }

  clear(table: Table) {
    table.clear();
    this.resetFiltersAndState();
    this.loadData({
      first: 0,
      rows: this.rows,
      sortField: undefined,
      sortOrder: undefined,
      filters: undefined,
      globalFilter: undefined
    });
  }

  private resetFiltersAndState(): void {
    this.searchValue = '';
    this.first = 0;
    this.sortField = undefined;
    this.sortOrder = 1;
    this.repFilterModel = [];
    this.statusFilterModel = undefined;
    this.activityRange = [this.activityMin, this.activityMax];
    this.selectedColumnKeys = this.columnToggleOptions.map(option => option.value);
    if (this.dt1) {
      this.dt1.clear();
      this.dt1.first = 0;
    }
  }

  private reloadTable(): void {
    const event: TableLazyLoadEvent = {
      first: this.first,
      rows: this.rows,
      sortField: this.sortField ?? (this.dt1 as any)?.sortField,
      sortOrder: this.sortOrder ?? (this.dt1 as any)?.sortOrder,
      filters: (this.dt1 as any)?.filters,
      globalFilter: this.searchValue
    };
    this.loadData(event);
  }

  onColumnToggleChange(values: string[] | undefined): void {
    const available = this.columnToggleOptions.map(option => option.value);
    if (!values || !values.length) {
      this.selectedColumnKeys = [...available];
    } else {
      this.selectedColumnKeys = values.filter(value => available.includes(value));
      if (!this.selectedColumnKeys.length) {
        this.selectedColumnKeys = [...available];
      }
    }
  }

  isColumnHidden(columnName: string): boolean {
    if (!this.selectedColumnKeys.length) {
      return false;
    }
    return !this.selectedColumnKeys.includes(columnName);
  }

  private syncColumnToggleOptions(columns?: ColumnDefinition[]): void {
    const sourceColumns = columns ?? this.schemaService.visibleColumns();
    const nextOptions = sourceColumns.map(column => ({
      label: column.displayName,
      value: column.name
    }));
    this.columnToggleOptions = nextOptions;
    if (!this.selectedColumnKeys.length) {
      this.selectedColumnKeys = nextOptions.map(option => option.value);
      return;
    }
    const availableValues = new Set(nextOptions.map(option => option.value));
    this.selectedColumnKeys = this.selectedColumnKeys.filter(value => availableValues.has(value));
    if (!this.selectedColumnKeys.length) {
      this.selectedColumnKeys = nextOptions.map(option => option.value);
    }
  }

  private updateColumnToggleSelectedLabel(): void {
    this.columnToggleSelectedItemsLabel = this.translate.instant('products.columnToggleSelectedItems');
  }

  private buildInitialFormModel(initial?: Record<string, any>): Record<string, any> {
    const model: Record<string, any> = {};
    const columns = this.schemaService.visibleColumns();
    columns.forEach(column => {
      const rawValue = initial ? initial[column.name] : undefined;
      model[column.name] = this.normalizeValueForInput(column, rawValue);
    });
    return model;
  }

  private normalizeValueForInput(column: ColumnDefinition, value: any): any {
    if (value === null || value === undefined) {
      return this.defaultValueForType(column.type);
    }
    switch (column.type) {
      case ColumnType.BOOLEAN:
        return Boolean(value);
      case ColumnType.INTEGER:
      case ColumnType.DECIMAL:
        return value;
      case ColumnType.DATE: {
        const date = value instanceof Date ? value : new Date(value);
        if (Number.isNaN(date.getTime())) {
          return '';
        }
        return date.toISOString().substring(0, 10);
      }
      case ColumnType.MINIO_IMAGE:
        return this.parseMinioValue(value, column);
      default:
        return value;
    }
  }

  private defaultValueForType(type: ColumnType): any {
    switch (type) {
      case ColumnType.BOOLEAN:
        return false;
      case ColumnType.MINIO_IMAGE:
        return null;
      default:
        return '';
    }
  }

  private collectAttributesFromFormModel(): Record<string, any> {
    const attributes: Record<string, any> = {};
    const columns = this.schemaService.visibleColumns();
    columns.forEach(column => {
      if (column.primaryKey && column.autoGenerated) {
        return;
      }
      const raw = this.formModel[column.name];
      const value = this.castValueForColumn(column, raw);
      if (value !== undefined) {
        attributes[column.name] = value;
      }
    });
    return attributes;
  }

  private castValueForColumn(column: ColumnDefinition, value: any): any {
    if (value === '' || value === undefined) {
      return column.required ? null : undefined;
    }
    switch (column.type) {
      case ColumnType.BOOLEAN:
        return !!value;
      case ColumnType.INTEGER: {
        const parsed = Number(value);
        return Number.isNaN(parsed) ? null : Math.trunc(parsed);
      }
      case ColumnType.DECIMAL: {
        const parsed = Number(value);
        return Number.isNaN(parsed) ? null : parsed;
      }
      case ColumnType.DATE:
        return value ? new Date(value).toISOString() : null;
      case ColumnType.MINIO_IMAGE:
        return this.normalizeMinioPayloadForSave(value, column);
      default:
        return value;
    }
  }

  private showSuccess(detail: string): void {
    this.messageService.add({
      severity: 'success',
      summary: this.translate.instant('products.toastSuccess'),
      detail
    });
  }

  private showError(detail: string): void {
    this.messageService.add({
      severity: 'error',
      summary: this.translate.instant('products.toastError'),
      detail
    });
  }

  /* ===========================
     FILTER HELPERS / MAPPERS
     =========================== */

  getFilterType(column: any): 'text' | 'numeric' | 'date' | 'boolean' {
    switch (column.type) {
      case ColumnType.TEXT:    return 'text';
      case ColumnType.INTEGER:
      case ColumnType.DECIMAL: return 'numeric';
      case ColumnType.DATE:    return 'date';
      case ColumnType.BOOLEAN: return 'boolean';
      default:                 return 'text';
    }
  }

  // Match mode hints for special example-like fields
  getMatchMode(column: any) {
    if (this.isRepresentative(column)) return 'in';        // multi-select
    if (this.isStatus(column))        return 'equals';     // equals
    if (this.isActivity(column))      return 'between';    // slider range
    return undefined;                                      // let PrimeNG choose default
  }

  getShowMatchModes(column: any) {
    // Hide match mode selector for specialized filters (as in your example)
    if (this.isRepresentative(column) || this.isActivity(column)) return false;
    return true;
  }

  /* ===========================
     “EXAMPLE” FIELD DETECTORS
     Adjust these to your schema metadata if needed.
     =========================== */
  isRepresentative(column: any) {
    // either explicit metadata coming from schema, or by name convention
    return column.name === 'representative' || column.rep === true || column.ui === 'representative';
  }

  isCountry(column: any) {
    return column.name === 'country' || column.ui === 'country';
  }

  isStatus(column: any) {
    return column.name === 'status' || column.ui === 'status';
  }

  isActivity(column: any) {
    return column.name === 'activity' || column.ui === 'activity';
  }

  /* ===========================
     VISUAL HELPERS
     =========================== */
  resolveImageSource(value: unknown): string | null {
    const payload = this.parseMinioValue(value);
    if (payload && payload.items?.length) {
      const first = payload.items.find(item => typeof item?.url === 'string' && item.url.trim().length);
      if (first?.url) {
        return first.url;
      }
    }
    if (typeof value === 'string' && this.looksLikeUrl(value)) {
      return value;
    }
    return null;
  }

  onImageFileSelected(event: Event, product: Record<string, any>, column: ColumnDefinition): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files && input.files.length ? input.files[0] : null;
    const productId = product?.['id'] as string | undefined;
    if (!this.canEdit || !file || !productId) {
      if (input) {
        input.value = '';
      }
      return;
    }

    if (!this.validateImageFile(file, column)) {
      if (input) {
        input.value = '';
      }
      return;
    }

    const existingPayload = this.parseMinioValue(product?.[column.name], column);
    const maxImages = this.resolveMaxImages(column, existingPayload);
    const replaceMode = maxImages === 1;
    if (!replaceMode && existingPayload && existingPayload.items.length >= maxImages) {
      this.showError(this.translate.instant('products.errors.maxImages', { max: maxImages }));
      if (input) {
        input.value = '';
      }
      return;
    }

    this.setImageUploading(productId, column.name, true);

    this.dataService.uploadProductImage(column.name, file).pipe(
      switchMap(upload => {
        const newItem = this.buildImageItem(upload);
        const items = replaceMode
          ? [newItem]
          : [...(existingPayload?.items ?? []), newItem];
        const payload = this.buildMinioPayload(column, items);
        return this.dataService.updateProduct(productId, { [column.name]: payload });
      }),
      finalize(() => {
        this.setImageUploading(productId, column.name, false);
        if (input) {
          input.value = '';
        }
      })
    ).subscribe({
      next: () => this.reloadTable(),
      error: () => this.showError(this.translate.instant('products.errors.update'))
    });
  }

  isImageUploading(productId: string | null | undefined, columnName: string): boolean {
    return !!this.imageUploadBusy[this.composeImageUploadKey(productId, columnName)];
  }

  private setImageUploading(productId: string | null | undefined, columnName: string, loading: boolean): void {
    const key = this.composeImageUploadKey(productId, columnName);
    if (loading) {
      this.imageUploadBusy[key] = true;
    } else {
      delete this.imageUploadBusy[key];
    }
  }

  private composeImageUploadKey(productId: string | null | undefined, columnName: string): string {
    return `${productId ?? 'new'}::${columnName}`;
  }

  onDialogImageSelected(event: Event, column: ColumnDefinition): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files && input.files.length ? input.files[0] : null;
    if (!file) {
      if (input) {
        input.value = '';
      }
      return;
    }

    if (!this.validateImageFile(file, column)) {
      if (input) {
        input.value = '';
      }
      return;
    }

    const existing = this.parseMinioValue(this.formModel[column.name], column);
    const maxImages = this.resolveMaxImages(column, existing);
    const replaceMode = maxImages === 1;
    if (!replaceMode && existing && existing.items.length >= maxImages) {
      this.showError(this.translate.instant('products.errors.maxImages', { max: maxImages }));
      if (input) {
        input.value = '';
      }
      return;
    }

    this.setImageUploading('dialog', column.name, true);

    this.dataService.uploadProductImage(column.name, file).pipe(
      finalize(() => {
        this.setImageUploading('dialog', column.name, false);
        if (input) {
          input.value = '';
        }
      })
    ).subscribe({
      next: upload => {
        const newItem = this.buildImageItem(upload);
        const items = replaceMode
          ? [newItem]
          : [...(existing?.items ?? []), newItem];
        this.formModel[column.name] = this.buildMinioPayload(column, items);
      },
      error: () => this.showError(this.translate.instant('products.errors.update'))
    });
  }

  clearDialogImage(column: ColumnDefinition): void {
    this.formModel[column.name] = null;
  }

  private looksLikeUrl(value: string): boolean {
    if (!value) {
      return false;
    }
    const lower = value.toLowerCase();
    return lower.startsWith('http://') || lower.startsWith('https://') || lower.startsWith('data:image') || lower.startsWith('blob:');
  }

  private parseMinioValue(value: unknown, column?: ColumnDefinition): MinioImageValue | null {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value === 'object' && value !== null && (value as MinioImageValue).type === 'MINIO_IMAGE' && Array.isArray((value as MinioImageValue).items)) {
      return this.buildMinioPayload(column, (value as MinioImageValue).items);
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) {
        return null;
      }
      if (!trimmed.startsWith('{')) {
        if (this.looksLikeUrl(trimmed)) {
          return this.buildMinioPayload(column, [{ key: '', url: trimmed }]);
        }
        return null;
      }
      try {
        return this.parseMinioValue(JSON.parse(trimmed), column);
      } catch {
        return null;
      }
    }
    if (typeof value !== 'object' || value === null) {
      return null;
    }
    const payload: any = value;
    const type = String(payload.type ?? '').toUpperCase();
    if (type !== 'MINIO_IMAGE') {
      const url = typeof payload.url === 'string' ? payload.url : undefined;
      if (url && this.looksLikeUrl(url)) {
        return this.buildMinioPayload(column, [{ key: String(payload.key ?? ''), url }]);
      }
      return null;
    }
    const items: MinioImageItem[] = Array.isArray(payload.items)
      ? payload.items.map((item: any) => ({
          key: typeof item?.key === 'string' ? item.key : '',
          url: typeof item?.url === 'string' ? item.url : '',
          expiresAt: typeof item?.expiresAt === 'string' ? item.expiresAt : undefined,
          contentType: typeof item?.contentType === 'string' ? item.contentType : undefined,
          sizeBytes: typeof item?.sizeBytes === 'number' ? item.sizeBytes : (typeof item?.size === 'number' ? item.size : undefined)
        })).filter((item: MinioImageItem) => item.url && item.url.trim().length)
      : [];
    return this.buildMinioPayload(column, items);
  }

  private buildImageItem(upload: MinioUploadResponse): MinioImageItem {
    return {
      key: upload.key,
      url: upload.url,
      expiresAt: upload.expiresAt ?? undefined,
      contentType: upload.contentType ?? undefined,
      sizeBytes: typeof upload.sizeBytes === 'number' ? upload.sizeBytes : undefined
    };
  }

  private buildMinioPayload(column: ColumnDefinition | undefined, items: MinioImageItem[]): MinioImageValue {
    const maxImages = this.resolveMaxImages(column);
    const constraints = this.getConstraints(column);
    const sanitized = items
      .map((item: MinioImageItem) => ({ ...item, url: item.url?.trim() ?? '' }))
      .filter((item: MinioImageItem) => !!item.url)
      .slice(0, maxImages);
    return {
      type: 'MINIO_IMAGE',
      items: sanitized,
      maxImages,
      constraints,
      count: sanitized.length
    };
  }

  maxImages(column: ColumnDefinition): number {
    return this.resolveMaxImages(column);
  }

  imageCount(column: ColumnDefinition, value: unknown): number {
    return this.parseMinioValue(value, column)?.items?.length ?? 0;
  }

  canReplaceImage(column: ColumnDefinition, value: unknown): boolean {
    return this.resolveMaxImages(column) === 1 && this.imageCount(column, value) > 0;
  }

  private getConstraints(column?: ColumnDefinition, payload?: MinioImageValue | any) {
    const payloadConstraints = payload && typeof payload === 'object' ? payload.constraints : undefined;
    const maxImages = this.resolveMaxImages(column, payload);
    const maxFileSizeRaw =
      payloadConstraints?.['maxFileSizeBytes'] ??
      column?.mediaConstraints?.maxFileSizeBytes ??
      column?.metadata?.['maxFileSizeBytes'] ??
      DEFAULT_MAX_IMAGE_SIZE_BYTES;
    const maxFileSize = this.safeNumber(maxFileSizeRaw, DEFAULT_MAX_IMAGE_SIZE_BYTES);
    const normalizedMax = Number.isFinite(maxFileSize) && maxFileSize > 0 ? maxFileSize : DEFAULT_MAX_IMAGE_SIZE_BYTES;
    const allowedMimeTypes = this.normalizeMimeTypes(
      payloadConstraints?.['allowedMimeTypes'] ??
      column?.mediaConstraints?.allowedMimeTypes ??
      column?.metadata?.['allowedMimeTypes']
    );
    return {
      maxImages,
      maxFileSizeBytes: normalizedMax,
      allowedMimeTypes: allowedMimeTypes.length ? allowedMimeTypes : undefined
    };
  }

  private normalizeMimeTypes(value: any): string[] {
    if (!value) {
      return [];
    }
    if (Array.isArray(value)) {
      return value.map(v => String(v).trim()).filter(Boolean);
    }
    return String(value).split(',').map(v => v.trim()).filter(Boolean);
  }

  private resolveMaxImages(column?: ColumnDefinition | null, payload?: MinioImageValue | any): number {
    const fromPayload = this.safeNumber(payload?.maxImages, NaN);
    if (Number.isFinite(fromPayload) && fromPayload > 0) {
      return Math.trunc(fromPayload);
    }
    const fromColumn = this.safeNumber(column?.mediaConstraints?.maxImages, NaN);
    if (Number.isFinite(fromColumn) && fromColumn > 0) {
      return Math.trunc(fromColumn);
    }
    const fromMetadata = this.safeNumber(column?.metadata?.['maxImages'], NaN);
    if (Number.isFinite(fromMetadata) && fromMetadata > 0) {
      return Math.trunc(fromMetadata);
    }
    return 1;
  }

  private normalizeMinioPayloadForSave(value: any, column: ColumnDefinition): MinioImageValue | null {
    const parsed = this.parseMinioValue(value, column);
    if (!parsed || parsed.items.length === 0) {
      return null;
    }
    const maxImages = this.resolveMaxImages(column, parsed);
    const constraints = this.getConstraints(column, parsed);
    return {
      type: 'MINIO_IMAGE',
      items: parsed.items.slice(0, maxImages),
      maxImages,
      constraints,
      count: parsed.items.length
    };
  }

  private validateImageFile(file: File, column: ColumnDefinition): boolean {
    const constraints = this.getConstraints(column);
    if (constraints.maxFileSizeBytes && file.size > constraints.maxFileSizeBytes) {
      this.showError(this.translate.instant('products.errors.fileTooLarge', {
        max: this.formatBytes(constraints.maxFileSizeBytes)
      }));
      return false;
    }
    if (constraints.allowedMimeTypes && constraints.allowedMimeTypes.length) {
      const mime = (file.type || '').toLowerCase();
      const allowed = constraints.allowedMimeTypes.map(m => m.toLowerCase());
      const matches = allowed.some(type => type.endsWith('/*')
        ? mime.startsWith(type.substring(0, type.indexOf('/')) + '/')
        : type === mime);
      if (!matches) {
        this.showError(this.translate.instant('products.errors.unsupportedImageType'));
        return false;
      }
    }
    return true;
  }

  private safeNumber(value: any, fallback: number): number {
    if (value === null || value === undefined) {
      return fallback;
    }
    const resolved = Number(value);
    return Number.isFinite(resolved) ? resolved : fallback;
  }

  private formatBytes(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) {
      return '0 B';
    }
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / Math.pow(1024, exponent);
    const precision = value >= 10 ? 0 : 1;
    return `${value.toFixed(precision)} ${units[exponent]}`;
  }

  getSeverity(status: string | null | undefined) {
    if (!status) return undefined;
    switch (status.toString().toLowerCase()) {
      case 'unqualified':
      case 'rejected':
      case 'false':
      case 'inactive':
        return 'danger';
      case 'qualified':
      case 'approved':
      case 'true':
      case 'active':
        return 'success';
      case 'negotiation':
      case 'pending':
        return 'warn';
      case 'new':
      case 'proposal':
        return 'info';
      default:
        return undefined;
    }
  }

  protected readonly HTMLInputElement = HTMLInputElement;
}
