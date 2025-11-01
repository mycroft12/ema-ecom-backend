import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild, effect, inject } from '@angular/core';
import {CommonModule, DOCUMENT} from '@angular/common';
import { FormsModule, NgForm, NgModel } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MessageService, ConfirmationService } from 'primeng/api';
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/inputtextarea';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { ProgressBarModule } from 'primeng/progressbar';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TagModule } from 'primeng/tag';
import { SliderModule } from 'primeng/slider';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ImageModule } from 'primeng/image';
import { MessageModule } from 'primeng/message';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputSwitchModule } from 'primeng/inputswitch';
import { DatePicker } from 'primeng/datepicker';
import { SharedDialogComponent } from '@shared/ui/dialog';

import { HybridTableDataService, HybridMinioUploadResponse } from '../../services/hybrid-table-data.service';
import { HybridSchemaService } from '../../services/hybrid-schema.service';
import { HybridColumnDefinition, HybridColumnType, HybridMinioImageItem, HybridMinioImageValue } from '../../models/hybrid-entity.model';
import { TableLazyLoadEvent } from '../../models/filter.model';
import { AuthService } from '../../../../core/auth.service';
import { Subject } from 'rxjs';
import { finalize, switchMap, takeUntil } from 'rxjs/operators';
import { HybridBadgeService, HybridUpsertEvent } from '../../services/hybrid-badge.service';

const DEFAULT_MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MiB

@Component({
  selector: 'app-hybrid-table',
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
    ProgressSpinnerModule,
    TagModule,
    SliderModule,
    ConfirmDialogModule,
    ImageModule,
    MessageModule,
    InputNumberModule,
    InputSwitchModule,
    DatePicker,
    InputTextarea,
    SharedDialogComponent
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './hybrid-table.component.html',
  styleUrls: ['./hybrid-table.component.scss']
})
export class HybridTableComponent implements OnInit, OnDestroy {
  @ViewChild('dt1') dt1!: Table;
  @ViewChild('dialogBody') dialogBody?: ElementRef<HTMLDivElement>;
  @ViewChild('recordForm') dialogFormDirective?: NgForm;

  readonly dataService = inject(HybridTableDataService);
  readonly schemaService = inject(HybridSchemaService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  readonly translate = inject(TranslateService);
  private readonly auth = inject(AuthService);
  private readonly badgeService = inject(HybridBadgeService);
  private readonly imageUploadBusy: Record<string, boolean> = {};
  readonly translationPrefix = this.schemaService.translationNamespace;

  private static dialogInstanceCounter = 0;
  private readonly dialogInstanceId = ++HybridTableComponent.dialogInstanceCounter;
  readonly dialogTitleId = `hybrid-dialog-title-${this.dialogInstanceId}`;
  readonly dialogFormId = `hybrid-dialog-form-${this.dialogInstanceId}`;

  HybridColumnType = HybridColumnType; // expose enum for TS helpers
  ColumnType = HybridColumnType; // backward-compatible alias for template bindings

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

  private readonly destroy$ = new Subject<void>();
  private lastLazyLoadEvent: TableLazyLoadEvent | null = null;
  private readonly realtimeEffectRef = effect(() => {
    const realtimeEvent = this.badgeService.upsertEvents()();
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

  private permissionsState = { add: false, edit: false, delete: false, export: false };

  displayDialog = false;
  dialogMode: 'create' | 'edit' = 'create';
  formModel: Record<string, any> = {};
  editingRecordId: string | null = null;
  saving = false;
  formSubmitted = false;
  dialogErrorMessage: string | null = null;
  dialogLoading = false;
  private dialogInitialModel: Record<string, any> = {};
  private pendingFocusHandle: ReturnType<typeof setTimeout> | null = null;
  readonly dateDisplayFormat = 'dd/mm/yy';
  readonly doc = inject(DOCUMENT);
  get canAdd(): boolean { return this.permissionsState.add; }
  get canEdit(): boolean { return this.permissionsState.edit; }
  get canDelete(): boolean { return this.permissionsState.delete; }
  get canExport(): boolean { return this.permissionsState.export; }
  get showActionColumn(): boolean { return this.canEdit || this.canDelete; }
  get dialogTitle(): string {
    const key = this.dialogMode === 'create' ? 'common.dialog.addTitle' : 'common.dialog.updateTitle';
    return this.translate.instant(key, { component: this.componentDisplayName });
  }
  get dialogSubtitle(): string {
    const key = `${this.translationPrefix}.dialog.subtitle`;
    const translated = this.translate.instant(key, { component: this.componentDisplayName });
    return translated === key ? '' : translated;
  }
  get submitLabel(): string {
    return this.translate.instant('common.save');
  }
  get hasVisibleFields(): boolean {
    return this.schemaService.visibleColumns().length > 0;
  }
  get hasRows(): boolean {
    const rows = this.dataService.records();
    return Array.isArray(rows) && rows.length > 0;
  }
  get dialogSize(): 'sm' | 'md' | 'lg' {
    const columnCount = this.schemaService.visibleColumns().length;
    if (columnCount >= 8) {
      return 'lg';
    }
    if (columnCount >= 4) {
      return 'md';
    }
    return 'sm';
  }
  trackColumn = (_: number, column: HybridColumnDefinition) => column.name;

  @HostListener('window:keydown', ['$event'])
  handleWindowKeydown(event: KeyboardEvent): void {
    if (!this.displayDialog) {
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      this.onDialogCloseRequested('escape');
    }
  }

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
    this.clearPendingFocus();
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

    this.dataService.loadRecords({
      ...event,
      sortField: this.sortField,
      sortOrder: this.sortOrder
    }).subscribe({
      next: resp => {
        this.totalRecords = resp.totalElements ?? 0;
        // 3) once data is in memory, derive example-like options dynamically
        const rows = this.dataService.records() ?? [];

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

  private handleRealtimeUpdate(event: HybridUpsertEvent): void {
    if (!this.lastLazyLoadEvent) {
      return;
    }
    console.debug('[HybridTable] Realtime upsert detected', event);
    this.loadData({ ...this.lastLazyLoadEvent });
  }

  onSort(event: { field: string; order: number }): void {
    this.sortField = event.field;
    this.sortOrder = event.order;
  }

  private refreshActionPermissions(): void {
    const permissions = new Set(this.auth.permissions() ?? []);
    this.permissionsState = {
      add: permissions.has(this.resolvePermissionName('create')),
      edit: permissions.has(this.resolvePermissionName('update')),
      delete: permissions.has(this.resolvePermissionName('delete')),
      export: permissions.has(this.resolvePermissionName('export'))
    };
  }

  private resolvePermissionName(action: 'create' | 'update' | 'delete' | 'export'): string {
    const prefix = (this.schemaService.entityTypeName ?? 'product').toLowerCase();
    if (action === 'export') {
      return `${prefix}:action:export:excel`;
    }
    return `${prefix}:${action}`;
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
    this.editingRecordId = null;
    this.dialogErrorMessage = null;
    this.dialogLoading = false;
    this.formModel = this.buildInitialFormModel();
    this.setInitialFormState();
    this.formSubmitted = false;
    this.displayDialog = true;
    this.queueFocusOnDialog();
  }

  onExportExcel(): void {
    this.dataService.exportToExcel();
  }

  openEditDialog(recordId: string): void {
    if (!this.canEdit || !recordId) {
      return;
    }
    this.dialogMode = 'edit';
    this.editingRecordId = recordId;
    this.formModel = this.buildInitialFormModel();
    this.formSubmitted = false;
    this.dialogErrorMessage = null;
    this.dialogLoading = true;
    this.setInitialFormState();
    this.displayDialog = true;
    this.dataService.getRecord(recordId).subscribe({
      next: product => {
        this.formModel = this.buildInitialFormModel(product);
        this.dialogLoading = false;
        this.setInitialFormState();
        this.queueFocusOnDialog();
      },
      error: () => {
        this.displayDialog = false;
        this.dialogLoading = false;
        this.showError(this.translate.instant(`${this.translationPrefix}.errors.loadOne`));
      }
    });
  }

  saveRecord(form: NgForm): void {
    this.formSubmitted = true;
    this.dialogErrorMessage = null;
    if (form.invalid) {
      this.focusFirstInvalidField();
      return;
    }
    const attributes = this.collectAttributesFromFormModel();
    this.saving = true;
    const request$ = this.dialogMode === 'create'
      ? this.dataService.createRecord(attributes)
      : this.dataService.updateRecord(this.editingRecordId!, attributes);

    request$.subscribe({
      next: () => {
        this.saving = false;
        this.showSuccess(this.translate.instant(
          this.dialogMode === 'create' ? `${this.translationPrefix}.toastCreated` : `${this.translationPrefix}.toastUpdated`
        ));
        this.forceCloseDialog();
        this.reloadTable();
      },
      error: () => {
        this.saving = false;
        this.dialogErrorMessage = this.translate.instant(
          this.dialogMode === 'create' ? `${this.translationPrefix}.errors.create` : `${this.translationPrefix}.errors.update`
        );
        this.focusFirstInvalidField();
      }
    });
  }

  onDialogCloseRequested(reason: 'cancel' | 'closeButton' | 'escape' | 'mask'): void {
    if (!this.displayDialog || this.saving || this.dialogLoading) {
      return;
    }
    if (this.isDialogDirty()) {
      this.confirmationService.confirm({
        header: this.translate.instant('common.dialog.discardTitle'),
        message: this.translate.instant('common.dialog.discardMessage', { component: this.componentDisplayName }),
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: this.translate.instant('common.discard'),
        rejectLabel: this.translate.instant('common.cancel'),
        acceptButtonStyleClass: 'p-button-danger',
        accept: () => this.forceCloseDialog()
      });
    } else {
      this.forceCloseDialog();
    }
  }

  onFieldChange(_fieldName: string): void {
    this.markDialogDirty();
  }

  onDateFieldChange(fieldName: string, value: Date | null): void {
    this.formModel[fieldName] = value ?? null;
    this.markDialogDirty();
  }

  getFieldContainerClasses(column: HybridColumnDefinition): Record<string, boolean> {
    const fullWidth = this.isFullWidthColumn(column);
    return {
      'md:col-6': !fullWidth,
      'md:col-12': fullWidth,
      'field-disabled': this.isColumnDisabled(column)
    };
  }

  getNumericRule(column: HybridColumnDefinition, key: 'min' | 'max'): number | null {
    const rulesValue = column.validationRules?.[key];
    if (rulesValue !== undefined && rulesValue !== null) {
      const numeric = Number(rulesValue);
      return Number.isNaN(numeric) ? null : numeric;
    }
    const metaValue = column.metadata?.[key];
    if (metaValue !== undefined && metaValue !== null) {
      const numeric = Number(metaValue);
      return Number.isNaN(numeric) ? null : numeric;
    }
    return null;
  }

  getDecimalScale(column: HybridColumnDefinition): number {
    const metaScale = column.metadata?.['scale'] ?? column.metadata?.['decimals'];
    const scale = column.scale ?? metaScale;
    return typeof scale === 'number' && !Number.isNaN(scale) ? scale : 2;
  }

  getPatternRule(column: HybridColumnDefinition): string | null {
    const fromRules = column.validationRules?.['pattern'];
    if (typeof fromRules === 'string' && fromRules.trim()) {
      return fromRules.trim();
    }
    const fromMeta = column.metadata?.['pattern'];
    if (typeof fromMeta === 'string' && fromMeta.trim()) {
      return fromMeta.trim();
    }
    return null;
  }

  getFieldHint(column: HybridColumnDefinition): string | null {
    const meta = (column.metadata ?? {}) as Record<string, any>;
    const hintKey = meta['hintKey'] ?? meta['helperKey'];
    if (typeof hintKey === 'string' && hintKey.trim()) {
      const translated = this.translate.instant(hintKey.trim(), { component: this.componentDisplayName });
      return translated === hintKey ? null : translated;
    }
    const hint = meta['hint'] ?? meta['helperText'] ?? meta['description'];
    if (typeof hint === 'string' && hint.trim()) {
      return hint.trim();
    }
    return null;
  }

  getFieldError(column: HybridColumnDefinition, control: NgModel | null): string | null {
    if (!control || !this.isFieldInvalid(control)) {
      return null;
    }
    const errors = control.errors ?? {};
    if (errors['required']) {
      return this.translate.instant('validation.required', { field: column.displayName });
    }
    if (errors['min']) {
      const min = this.getNumericRule(column, 'min');
      return this.translate.instant('validation.min', { field: column.displayName, min });
    }
    if (errors['max']) {
      const max = this.getNumericRule(column, 'max');
      return this.translate.instant('validation.max', { field: column.displayName, max });
    }
    if (errors['pattern']) {
      return this.translate.instant('validation.pattern', { field: column.displayName });
    }
    return this.translate.instant('validation.generic', { field: column.displayName });
  }

  getFieldErrorId(columnName: string): string {
    return `${this.dialogFormId}-${columnName}-error`;
  }

  getFieldHintId(columnName: string): string {
    return `${this.dialogFormId}-${columnName}-hint`;
  }

  getFieldAriaDescribedBy(columnName: string, control: NgModel | null): string | null {
    const ids: string[] = [];
    const hint = this.getFieldHintByName(columnName);
    if (hint) {
      ids.push(this.getFieldHintId(columnName));
    }
    if (control && this.isFieldInvalid(control)) {
      ids.push(this.getFieldErrorId(columnName));
    }
    return ids.length ? ids.join(' ') : null;
  }

  isFieldInvalid(control: NgModel | null): boolean {
    if (!control) {
      return false;
    }
    return Boolean(control.invalid) && (control.dirty || this.formSubmitted);
  }

  uploadButtonLabel(column: HybridColumnDefinition): string {
    const key = this.canReplaceImage(column, this.formModel[column.name])
      ? `${this.translationPrefix}.replaceImage`
      : `${this.translationPrefix}.uploadImage`;
    return this.translate.instant(key);
  }

  getImageConstraintsHint(column: HybridColumnDefinition): string | null {
    const maxImages = this.resolveMaxImages(column);
    const constraints = column.mediaConstraints ?? column.metadata?.['mediaConstraints'];
    const parts: string[] = [];
    if (maxImages) {
      parts.push(this.translate.instant('validation.maxImages', { max: maxImages }));
    }
    const maxSize = this.resolveMaxFileSize(column, constraints);
    if (maxSize) {
      const sizeMb = (maxSize / (1024 * 1024)).toFixed(1);
      parts.push(this.translate.instant('validation.maxFileSize', { size: sizeMb }));
    }
    return parts.length ? parts.join(' • ') : null;
  }

  private resolveMaxFileSize(column: HybridColumnDefinition, constraints?: any): number | null {
    const candidate = (constraints && constraints.maxFileSizeBytes !== undefined)
      ? constraints.maxFileSizeBytes
      : this.getConstraints(column)?.maxFileSizeBytes;
    if (candidate === undefined || candidate === null) {
      return null;
    }
    const numeric = Number(candidate);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
  }

  private forceCloseDialog(): void {
    this.displayDialog = false;
    this.formSubmitted = false;
    this.saving = false;
    this.dialogLoading = false;
    this.editingRecordId = null;
    this.dialogErrorMessage = null;
    this.formModel = {};
    this.dialogInitialModel = {};
    this.clearPendingFocus();
  }

  private setInitialFormState(): void {
    this.dialogInitialModel = this.cloneModel(this.formModel);
    this.dialogErrorMessage = null;
  }

  private isDialogDirty(): boolean {
    return JSON.stringify(this.formModel ?? {}) !== JSON.stringify(this.dialogInitialModel ?? {});
  }

  private cloneModel(model: Record<string, any>): Record<string, any> {
    return JSON.parse(JSON.stringify(model ?? {}));
  }

  private queueFocusOnDialog(): void {
    this.clearPendingFocus();
    this.pendingFocusHandle = setTimeout(() => {
      const container = this.dialogBody?.nativeElement;
      if (!container) {
        return;
      }
      const selectors = [
        '[data-focus-anchor] input:not([type=hidden])',
        '[data-focus-anchor] textarea',
        '[data-focus-anchor] select',
        '[data-focus-anchor] .p-inputswitch-input',
        '[data-focus-anchor] button'
      ];
      let target: HTMLElement | null = null;
      for (const selector of selectors) {
        target = container.querySelector<HTMLElement>(selector);
        if (target) {
          break;
        }
      }
      target ??= container.querySelector<HTMLElement>('button, [tabindex]');
      target?.focus();
    }, 75);
  }

  private clearPendingFocus(): void {
    if (this.pendingFocusHandle) {
      clearTimeout(this.pendingFocusHandle);
      this.pendingFocusHandle = null;
    }
  }

  private focusFirstInvalidField(): void {
    setTimeout(() => {
      const container = this.dialogBody?.nativeElement;
      if (!container) {
        return;
      }
      const selectors = [
        '.field .p-invalid input',
        '.field .p-invalid textarea',
        '.field .p-invalid select',
        '.field .p-invalid .p-inputswitch-input',
        '.field input.ng-invalid',
        '.field textarea.ng-invalid'
      ];
      let element: HTMLElement | null = null;
      for (const selector of selectors) {
        element = container.querySelector<HTMLElement>(selector);
        if (element) {
          break;
        }
      }
      element ??= container.querySelector<HTMLElement>('[data-focus-anchor] input, [data-focus-anchor] textarea');
      element?.focus();
    }, 50);
  }

  private isFullWidthColumn(column: HybridColumnDefinition): boolean {
    if (column.type === HybridColumnType.MINIO_IMAGE) {
      return true;
    }
    if (this.isTextarea(column)) {
      return true;
    }
    const metaLayout = column.metadata?.['layout'] ?? column.metadata?.['width'];
    if (typeof metaLayout === 'string') {
      const normalized = metaLayout.trim().toLowerCase();
      if (['full', 'fullwidth', 'wide', '12', '100%'].includes(normalized)) {
        return true;
      }
    }
    return false;
  }

  private isTextarea(column: HybridColumnDefinition): boolean {
    const meta = (column.metadata ?? {}) as Record<string, any>;
    return meta['textarea'] === true
      || meta['input'] === 'textarea'
      || meta['component'] === 'textarea'
      || meta['type'] === 'textarea';
  }

  isColumnReadOnly(column: HybridColumnDefinition): boolean {
    const meta = (column.metadata ?? {}) as Record<string, any>;
    if (column.primaryKey && column.autoGenerated) {
      return true;
    }
    if (meta['readonly'] === true || meta['readOnly'] === true) {
      return true;
    }
    if (meta['editable'] === false) {
      return true;
    }
    return false;
  }

  isColumnDisabled(column: HybridColumnDefinition): boolean {
    const meta = (column.metadata ?? {}) as Record<string, any>;
    if (this.isColumnReadOnly(column)) {
      return true;
    }
    return meta['disabled'] === true;
  }

  private markDialogDirty(): void {
    this.dialogErrorMessage = null;
  }

  private getFieldHintByName(columnName: string): string | null {
    const column = this.findColumnDefinition(columnName);
    return column ? this.getFieldHint(column) : null;
  }

  private findColumnDefinition(columnName: string): HybridColumnDefinition | undefined {
    return this.schemaService.visibleColumns().find(col => col.name === columnName);
  }

  private get componentDisplayName(): string {
    return this.schemaService.displayName();
  }

  confirmDeleteRecord(recordId: string): void {
    if (!this.canDelete || !recordId) {
      return;
    }
    const header = this.translate.instant(`${this.translationPrefix}.confirmDeleteHeader`);
    const message = this.translate.instant(`${this.translationPrefix}.confirmDeleteMessage`);
    this.confirmationService.confirm({
      header,
      message,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.translate.instant('common.yes'),
      rejectLabel: this.translate.instant('common.cancel'),
      accept: () => this.deleteRecord(recordId)
    });
  }

  private deleteRecord(recordId: string): void {
    this.dataService.deleteRecord(recordId).subscribe({
      next: () => {
        this.resetFiltersAndState();
        this.showSuccess(this.translate.instant(`${this.translationPrefix}.toastDeleted`));
        this.reloadTable();
      },
      error: () => this.showError(this.translate.instant(`${this.translationPrefix}.errors.delete`))
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

  private syncColumnToggleOptions(columns?: HybridColumnDefinition[]): void {
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
    this.columnToggleSelectedItemsLabel = this.translate.instant(`${this.translationPrefix}.columnToggleSelectedItems`);
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

  private normalizeValueForInput(column: HybridColumnDefinition, value: any): any {
    if (value === null || value === undefined) {
      return this.defaultValueForType(column.type);
    }
    switch (column.type) {
      case HybridColumnType.BOOLEAN:
        return Boolean(value);
      case HybridColumnType.INTEGER:
      case HybridColumnType.DECIMAL:
        return value;
      case HybridColumnType.DATE: {
        const date = value instanceof Date ? value : new Date(value);
        if (Number.isNaN(date.getTime())) {
          return null;
        }
        return date;
      }
      case HybridColumnType.MINIO_IMAGE:
        return this.parseMinioValue(value, column);
      default:
        return value;
    }
  }

  private defaultValueForType(type: HybridColumnType): any {
    switch (type) {
      case HybridColumnType.BOOLEAN:
        return false;
      case HybridColumnType.MINIO_IMAGE:
        return null;
      case HybridColumnType.DATE:
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

  private castValueForColumn(column: HybridColumnDefinition, value: any): any {
    if (value === '' || value === undefined) {
      return column.required ? null : undefined;
    }
    switch (column.type) {
      case HybridColumnType.BOOLEAN:
        return !!value;
      case HybridColumnType.INTEGER: {
        const parsed = Number(value);
        return Number.isNaN(parsed) ? null : Math.trunc(parsed);
      }
      case HybridColumnType.DECIMAL: {
        const parsed = Number(value);
        return Number.isNaN(parsed) ? null : parsed;
      }
      case HybridColumnType.DATE: {
        if (!value) {
          return null;
        }
        const date = value instanceof Date ? value : new Date(value);
        return Number.isNaN(date.getTime()) ? null : date.toISOString();
      }
      case HybridColumnType.MINIO_IMAGE:
        return this.normalizeMinioPayloadForSave(value, column);
      default:
        return value;
    }
  }

  private showSuccess(detail: string): void {
    this.messageService.add({
      severity: 'success',
      summary: this.translate.instant(`${this.translationPrefix}.toastSuccess`),
      detail
    });
  }

  private showError(detail: string): void {
    this.messageService.add({
      severity: 'error',
      summary: this.translate.instant(`${this.translationPrefix}.toastError`),
      detail
    });
  }

  /* ===========================
     FILTER HELPERS / MAPPERS
     =========================== */

  getFilterType(column: any): 'text' | 'numeric' | 'date' | 'boolean' {
    switch (column.type) {
      case HybridColumnType.TEXT:    return 'text';
      case HybridColumnType.INTEGER:
      case HybridColumnType.DECIMAL: return 'numeric';
      case HybridColumnType.DATE:    return 'date';
      case HybridColumnType.BOOLEAN: return 'boolean';
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

  onImageFileSelected(event: Event, product: Record<string, any>, column: HybridColumnDefinition): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files && input.files.length ? input.files[0] : null;
    const recordId = product?.['id'] as string | undefined;
    if (!this.canEdit || !file || !recordId) {
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
      this.showError(this.translate.instant(`${this.translationPrefix}.errors.maxImages`, { max: maxImages }));
      if (input) {
        input.value = '';
      }
      return;
    }

    this.setImageUploading(recordId, column.name, true);

    this.dataService.uploadImage(column.name, file).pipe(
      switchMap(upload => {
        const newItem = this.buildImageItem(upload);
        const items = replaceMode
          ? [newItem]
          : [...(existingPayload?.items ?? []), newItem];
        const payload = this.buildMinioPayload(column, items);
        return this.dataService.updateRecord(recordId, { [column.name]: payload });
      }),
      finalize(() => {
        this.setImageUploading(recordId, column.name, false);
        if (input) {
          input.value = '';
        }
      })
    ).subscribe({
      next: () => this.reloadTable(),
      error: () => this.showError(this.translate.instant(`${this.translationPrefix}.errors.update`))
    });
  }

  isImageUploading(recordId: string | null | undefined, columnName: string): boolean {
    return !!this.imageUploadBusy[this.composeImageUploadKey(recordId, columnName)];
  }

  private setImageUploading(recordId: string | null | undefined, columnName: string, loading: boolean): void {
    const key = this.composeImageUploadKey(recordId, columnName);
    if (loading) {
      this.imageUploadBusy[key] = true;
    } else {
      delete this.imageUploadBusy[key];
    }
  }

  private composeImageUploadKey(recordId: string | null | undefined, columnName: string): string {
    return `${recordId ?? 'new'}::${columnName}`;
  }

  onDialogImageSelected(event: Event, column: HybridColumnDefinition): void {
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
      this.showError(this.translate.instant(`${this.translationPrefix}.errors.maxImages`, { max: maxImages }));
      if (input) {
        input.value = '';
      }
      return;
    }

    this.setImageUploading('dialog', column.name, true);

    this.dataService.uploadImage(column.name, file).pipe(
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
        this.markDialogDirty();
      },
      error: () => this.showError(this.translate.instant(`${this.translationPrefix}.errors.update`))
    });
  }

  clearDialogImage(column: HybridColumnDefinition): void {
    this.formModel[column.name] = null;
    this.markDialogDirty();
  }

  private looksLikeUrl(value: string): boolean {
    if (!value) {
      return false;
    }
    const lower = value.toLowerCase();
    return lower.startsWith('http://') || lower.startsWith('https://') || lower.startsWith('data:image') || lower.startsWith('blob:');
  }

  private parseMinioValue(value: unknown, column?: HybridColumnDefinition): HybridMinioImageValue | null {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value === 'object' && value !== null && (value as HybridMinioImageValue).type === 'MINIO_IMAGE' && Array.isArray((value as HybridMinioImageValue).items)) {
      return this.buildMinioPayload(column, (value as HybridMinioImageValue).items);
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
    const items: HybridMinioImageItem[] = Array.isArray(payload.items)
      ? payload.items.map((item: any) => ({
          key: typeof item?.key === 'string' ? item.key : '',
          url: typeof item?.url === 'string' ? item.url : '',
          expiresAt: typeof item?.expiresAt === 'string' ? item.expiresAt : undefined,
          contentType: typeof item?.contentType === 'string' ? item.contentType : undefined,
          sizeBytes: typeof item?.sizeBytes === 'number' ? item.sizeBytes : (typeof item?.size === 'number' ? item.size : undefined)
        })).filter((item: HybridMinioImageItem) => item.url && item.url.trim().length)
      : [];
    return this.buildMinioPayload(column, items);
  }

  private buildImageItem(upload: HybridMinioUploadResponse): HybridMinioImageItem {
    return {
      key: upload.key,
      url: upload.url,
      expiresAt: upload.expiresAt ?? undefined,
      contentType: upload.contentType ?? undefined,
      sizeBytes: typeof upload.sizeBytes === 'number' ? upload.sizeBytes : undefined
    };
  }

  private buildMinioPayload(column: HybridColumnDefinition | undefined, items: HybridMinioImageItem[]): HybridMinioImageValue {
    const maxImages = this.resolveMaxImages(column);
    const constraints = this.getConstraints(column);
    const sanitized = items
      .map((item: HybridMinioImageItem) => ({ ...item, url: item.url?.trim() ?? '' }))
      .filter((item: HybridMinioImageItem) => !!item.url)
      .slice(0, maxImages);
    return {
      type: 'MINIO_IMAGE',
      items: sanitized,
      maxImages,
      constraints,
      count: sanitized.length
    };
  }

  maxImages(column: HybridColumnDefinition): number {
    return this.resolveMaxImages(column);
  }

  imageCount(column: HybridColumnDefinition, value: unknown): number {
    return this.parseMinioValue(value, column)?.items?.length ?? 0;
  }

  canReplaceImage(column: HybridColumnDefinition, value: unknown): boolean {
    return this.resolveMaxImages(column) === 1 && this.imageCount(column, value) > 0;
  }

  private getConstraints(column?: HybridColumnDefinition, payload?: HybridMinioImageValue | any) {
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

  private resolveMaxImages(column?: HybridColumnDefinition | null, payload?: HybridMinioImageValue | any): number {
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

  private normalizeMinioPayloadForSave(value: any, column: HybridColumnDefinition): HybridMinioImageValue | null {
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

  private validateImageFile(file: File, column: HybridColumnDefinition): boolean {
    const constraints = this.getConstraints(column);
    if (constraints.maxFileSizeBytes && file.size > constraints.maxFileSizeBytes) {
      this.showError(this.translate.instant(`${this.translationPrefix}.errors.fileTooLarge`, {
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
        this.showError(this.translate.instant(`${this.translationPrefix}.errors.unsupportedImageType`));
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
