import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
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

import { ProductDataService } from '../../services/product-data.service';
import { ProductSchemaService } from '../../services/product-schema.service';
import { ColumnType } from '../../models/product-schema.model';
import { TableLazyLoadEvent } from '../../models/filter.model';

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
    SliderModule
  ],
  providers: [MessageService],
  templateUrl: './product-table.component.html',
  styleUrls: ['./product-table.component.scss']
})
export class ProductTableComponent implements OnInit {
  @ViewChild('dt1') dt1!: Table;

  readonly dataService = inject(ProductDataService);
  readonly schemaService = inject(ProductSchemaService);
  private readonly messageService = inject(MessageService);
  readonly translate = inject(TranslateService);

  ColumnType = ColumnType; // expose enum to template

  loading = false;
  searchValue?: string;
  globalFilterFields: string[] = [];
  rows = 10;
  totalRecords = 0;
  first = 0;

  // “example-like” filter models + options
  representativeOptions: Array<{ name: string; image: string }> = [];
  statusOptions: Array<{ label: string; value: string }> = [];
  repFilterModel: any[] = [];
  statusFilterModel?: string;

  // activity range (between)
  activityMin = 0;
  activityMax = 100;
  activityRange: [number, number] = [0, 100];

  ngOnInit() {
    this.loading = true;
    // 1) build globalFilterFields from dynamic schema
    this.updateGlobalFilterFields();

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

  onLazyLoad(event: TableLazyLoadEvent) {
    this.rows = event.rows ?? this.rows;
    this.first = event.first ?? 0;
    this.loadData(event);
  }

  private loadData(event: TableLazyLoadEvent) {
    this.loading = true;
    this.updateGlobalFilterFields();
    this.dataService.loadProducts(event).subscribe({
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

  updateGlobalFilterFields() {
    this.globalFilterFields = this.schemaService.visibleColumns().map(c => c.name);
  }

  clear(table: Table) {
    table.clear();
    this.searchValue = '';
    this.first = 0;
    this.repFilterModel = [];
    this.statusFilterModel = undefined;
    this.activityRange = [this.activityMin, this.activityMax];
    this.loadData({
      first: 0,
      rows: this.rows,
      sortField: undefined,
      sortOrder: undefined,
      filters: undefined,
      globalFilter: undefined
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
