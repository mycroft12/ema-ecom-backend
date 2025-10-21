import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { DropdownModule } from 'primeng/dropdown';
import { CardModule } from 'primeng/card';
import { ProductSchemaService } from '../../services/product-schema.service';
import { ProductFilterService } from '../../services/product-filter.service';
import { CustomFilter, FilterCondition, FilterOperator } from '../../models/filter.model';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-custom-filter-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, InputTextModule, CheckboxModule, DropdownModule, CardModule, TranslateModule],
  template: `
    <div class="p-fluid formgrid grid">
      <div class="field col-12">
        <label for="filterName">{{ 'products.filterName' | translate }}</label>
        <input id="filterName" type="text" pInputText [(ngModel)]="filterName" />
      </div>

      <div class="field col-12">
        <label>{{ 'products.conditions' | translate }}</label>
        <div class="flex flex-column gap-2">
          <div class="flex align-items-center gap-2" *ngFor="let c of conditions(); let i = index">
            <select class="p-inputtext p-component" [(ngModel)]="c.field">
              <option *ngFor="let col of schemaService.visibleColumns()" [value]="col.name">{{ col.displayName }}</option>
            </select>
            <select class="p-inputtext p-component" [(ngModel)]="c.operator">
              <option *ngFor="let op of operators" [value]="op.value">{{ op.label | translate }}</option>
            </select>
            <input type="text" pInputText [(ngModel)]="c.value" [placeholder]="'products.valuePlaceholder' | translate" />
            <button pButton type="button" icon="pi pi-times" class="p-button-danger p-button-text" (click)="removeCondition(i)"></button>
          </div>
          <button pButton type="button" [label]="'products.addCondition' | translate" icon="pi pi-plus" (click)="addCondition()"></button>
        </div>
      </div>

      <div class="field-checkbox col-12">
        <p-checkbox [(ngModel)]="isPublic" [binary]="true" inputId="isPublic" />
        <label for="isPublic" class="ml-2">{{ 'products.makePublic' | translate }}</label>
      </div>

      <div class="col-12 flex justify-content-end gap-2">
        <button pButton type="button" [label]="'products.btnCancel' | translate" class="p-button-text" (click)="cancel.emit()"></button>
        <button pButton type="button" [label]="'products.btnSaveApply' | translate" icon="pi pi-check" (click)="saveAndApply()"></button>
      </div>
    </div>
  `
})
export class CustomFilterBuilderComponent {
  readonly schemaService = inject(ProductSchemaService);
  readonly filterService = inject(ProductFilterService);
  private readonly translate = inject(TranslateService);

  @Output() filterApplied = new EventEmitter<CustomFilter>();
  @Output() cancel = new EventEmitter<void>();

  filterName = '';
  isPublic = false;
  readonly conditions = signal<FilterCondition[]>([]);

  operators = [
    { label: 'products.opEquals', value: FilterOperator.EQUALS },
    { label: 'products.opContains', value: FilterOperator.CONTAINS },
    { label: 'products.opStartsWith', value: FilterOperator.STARTS_WITH },
    { label: 'products.opEndsWith', value: FilterOperator.ENDS_WITH },
    { label: 'products.opGreaterThan', value: FilterOperator.GREATER_THAN },
    { label: 'products.opLessThan', value: FilterOperator.LESS_THAN }
  ];

  addCondition(): void {
    const firstField = this.schemaService.visibleColumns()[0]?.name || 'name';
    this.conditions.update(list => [...list, { field: firstField, operator: FilterOperator.CONTAINS, value: '' }]);
  }

  removeCondition(index: number): void {
    this.conditions.update(list => list.filter((_, i) => i !== index));
  }

  saveAndApply(): void {
    const filter: CustomFilter = {
      name: this.filterName || this.translate.instant('products.defaultFilterName'),
      entityType: 'products',
      conditions: this.conditions(),
      isPublic: this.isPublic
    };
    this.filterService.saveFilter(filter).subscribe(saved => {
      this.filterService.setActiveFilter(saved);
      this.filterApplied.emit(saved);
      this.resetForm();
    });
  }

  private resetForm(): void {
    this.filterName = '';
    this.isPublic = false;
    this.conditions.set([]);
  }
}
