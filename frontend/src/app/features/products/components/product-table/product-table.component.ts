import { Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductDataService } from '../../services/product-data.service';
import { ProductSchemaService } from '../../services/product-schema.service';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Table, TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { ProgressBarModule } from 'primeng/progressbar';
import { TagModule } from 'primeng/tag';
import { SliderModule } from 'primeng/slider';
import { ColumnType } from '../../models/product-schema.model';

@Component({
  selector: 'app-product-table',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    ToastModule,
    TranslateModule,
    TableModule,
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

  loading = false;
  searchValue: string | undefined;

  // Map to store filter values for each column
  filterValues = new Map<string, any>();

  // Map to store global filter fields
  globalFilterFields: string[] = [];

  ngOnInit() {
    this.loading = true;
    // Update global filter fields based on visible columns
    this.updateGlobalFilterFields();
    // Load products using the data service
    this.dataService.loadProducts({
      first: 0,
      rows: 10,
      sortField: undefined,
      sortOrder: undefined,
      filters: undefined,
      globalFilter: undefined
    }).subscribe(() => {
      this.loading = false;
    });
  }

  updateGlobalFilterFields() {
    // Update global filter fields based on visible columns
    this.globalFilterFields = this.schemaService.visibleColumns().map(column => column.name);
  }

  clear(table: Table) {
    table.clear();
    this.searchValue = '';
  }

  getFilterType(column: any) {
    // Return the appropriate filter type based on the column type
    switch (column.type) {
      case ColumnType.TEXT:
        return 'text';
      case ColumnType.INTEGER:
      case ColumnType.DECIMAL:
        return 'numeric';
      case ColumnType.DATE:
        return 'date';
      case ColumnType.BOOLEAN:
        return 'boolean';
      default:
        return 'text';
    }
  }

  getSeverity(status: string) {
    // This is a generic method to get severity for status values
    // It can be customized based on your application's needs
    if (!status) return null;

    switch (status.toString().toLowerCase()) {
      case 'true':
      case 'active':
      case 'approved':
      case 'qualified':
        return 'success';
      case 'false':
      case 'inactive':
      case 'rejected':
      case 'unqualified':
        return 'danger';
      case 'pending':
      case 'negotiation':
        return 'warning';
      case 'new':
        return 'info';
      default:
        return null;
    }
  }

  exportExcel(): void {
    this.dataService.exportToExcel();
    this.messageService.add({ severity: 'info', summary: this.translate.instant('products.toastExportInfo'), detail: this.translate.instant('products.toastExportDetail') });
  }
}
