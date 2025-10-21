import { Component, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
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

import { ProductDataService } from '../../services/product-data.service';
import { ProductSchemaService } from '../../services/product-schema.service';
import { ColumnDefinition, ColumnType } from '../../models/product-schema.model';
import { TableLazyLoadEvent } from '../../models/filter.model';
import { AuthService } from '../../../../core/auth.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

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
    ConfirmDialogModule
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

  // “example-like” filter models + options
  representativeOptions: Array<{ name: string; image: string }> = [];
  statusOptions: Array<{ label: string; value: string }> = [];
  repFilterModel: any[] = [];
  statusFilterModel?: string;

  // activity range (between)
  activityMin = 0;
  activityMax = 100;
  activityRange: [number, number] = [0, 100];

  private readonly actionPrefix = 'product:action:';
  private permissionsState = { add: false, edit: false, delete: false };

  displayDialog = false;
  dialogMode: 'create' | 'edit' = 'create';
  formModel: Record<string, any> = {};
  editingProductId: string | null = null;
  saving = false;
  formSubmitted = false;

  get canAdd(): boolean { return this.permissionsState.add; }
  get canEdit(): boolean { return this.permissionsState.edit; }
  get canDelete(): boolean { return this.permissionsState.delete; }
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
  }

  onLazyLoad(event: TableLazyLoadEvent) {
    this.rows = event.rows ?? this.rows;
    this.first = event.first ?? 0;
    this.loadData(event);
  }

  private loadData(event: TableLazyLoadEvent) {
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

  onSort(event: { field: string; order: number }): void {
    this.sortField = event.field;
    this.sortOrder = event.order;
  }

  private refreshActionPermissions(): void {
    const permissions = new Set(this.auth.permissions() ?? []);
    this.permissionsState = {
      add: permissions.has(this.actionPermission('add')),
      edit: permissions.has(this.actionPermission('update')),
      delete: permissions.has(this.actionPermission('delete'))
    };
  }

  onGlobalFilter(event: Event, table: Table): void {
    const value = (event.target as HTMLInputElement)?.value ?? '';
    this.searchValue = value;
    table.filterGlobal(value, 'contains');
  }

  private actionPermission(action: 'add' | 'update' | 'delete'): string {
    return `${this.actionPrefix}${action}`;
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
      default:
        return value;
    }
  }

  private defaultValueForType(type: ColumnType): any {
    switch (type) {
      case ColumnType.BOOLEAN:
        return false;
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
