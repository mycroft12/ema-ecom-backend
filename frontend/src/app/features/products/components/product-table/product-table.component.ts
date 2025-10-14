import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductSchemaService } from '../../services/product-schema.service';
import { ProductDataService } from '../../services/product-data.service';
import { ProductFilterService } from '../../services/product-filter.service';
import { Product } from '../../models/product.model';
import { TableLazyLoadEvent } from '../../models/filter.model';
import { TableModule, TableLazyLoadEvent as PrimeNGTableLazyLoadEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToolbarModule } from 'primeng/toolbar';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { CustomFilterBuilderComponent } from '../custom-filter-builder/custom-filter-builder.component';
import { DialogModule } from 'primeng/dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-product-table',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    ToolbarModule,
    ConfirmDialogModule,
    ToastModule,
    DialogModule,
    CustomFilterBuilderComponent,
    TranslateModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './product-table.component.html',
  styleUrls: ['./product-table.component.scss']
})
export class ProductTableComponent implements OnInit {
  getColumnFieldNames(): string[] { return this.schemaService.visibleColumns().map(c => c.name); }
  readonly schemaService = inject(ProductSchemaService);
  readonly dataService = inject(ProductDataService);
  readonly filterService = inject(ProductFilterService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  readonly translate = inject(TranslateService);

  readonly selectedProducts = signal<Product[]>([]);
  readonly showFilterBuilder = signal<boolean>(false);
  readonly globalFilterValue = signal<string>('');

  ngOnInit(): void {
    this.filterService.loadFilters();
  }

  onLazyLoad(event: PrimeNGTableLazyLoadEvent): void {
    const lazyEvent: TableLazyLoadEvent = {
      first: event.first ?? 0,
      rows: event.rows ?? 10,
      sortField: event.sortField as string | undefined,
      sortOrder: event.sortOrder ?? 1,
      filters: event.filters,
      globalFilter: this.globalFilterValue()
    };

    const activeFilter = this.filterService.activeFilter();
    this.dataService.loadProducts(lazyEvent, activeFilter?.id).subscribe();
  }

  onGlobalFilter(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.globalFilterValue.set(value);
    this.onLazyLoad({ first: 0, rows: 10 } as PrimeNGTableLazyLoadEvent);
  }

  deleteSelectedProducts(): void {
    const selected = this.selectedProducts();
    if (!selected.length) return;
    this.confirmationService.confirm({
      message: this.translate.instant('products.confirmBulkDeleteMessage', { count: selected.length }),
      header: this.translate.instant('products.confirmBulkDeleteHeader'),
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        const ids = selected.map(p => p.id);
        this.dataService.bulkDelete(ids).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: this.translate.instant('products.toastSuccess'), detail: this.translate.instant('products.toastDeletedMany', { count: selected.length }) });
            this.selectedProducts.set([]);
            this.onLazyLoad({ first: 0, rows: 10 } as PrimeNGTableLazyLoadEvent);
          },
          error: () => this.messageService.add({ severity: 'error', summary: this.translate.instant('products.toastError'), detail: this.translate.instant('products.toastError') })
        });
      }
    });
  }

  exportExcel(): void {
    this.dataService.exportToExcel();
    this.messageService.add({ severity: 'info', summary: this.translate.instant('products.toastExportInfo'), detail: this.translate.instant('products.toastExportDetail') });
  }

  openFilterBuilder(): void {
    this.showFilterBuilder.set(true);
  }

  onFilterApplied(): void {
    this.showFilterBuilder.set(false);
    this.onLazyLoad({ first: 0, rows: 10 } as PrimeNGTableLazyLoadEvent);
  }
}
