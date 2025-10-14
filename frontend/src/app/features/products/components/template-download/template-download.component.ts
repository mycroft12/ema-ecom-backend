import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductSchemaService } from '../../services/product-schema.service';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { TooltipModule } from 'primeng/tooltip';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-template-download',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule, DividerModule, TooltipModule, TranslateModule],
  template: `
    <div class="template-download-section">
      <h3>{{ 'products.downloadExamples' | translate }}</h3>
      <p class="text-600 mb-3">
        {{ 'products.downloadExplain' | translate }}
      </p>
      <ul class="text-600 mb-4">
        <li><strong>{{ 'products.row1' | translate }}</strong> {{ 'products.row1Text' | translate }}</li>
        <li><strong>{{ 'products.row2' | translate }}</strong> {{ 'products.row2Text' | translate }}</li>
        <li><strong>{{ 'products.row3' | translate }}</strong> {{ 'products.row3Text' | translate }}</li>
      </ul>

      <div class="flex gap-3">
        <p-button [label]="'products.btnDownloadBasic' | translate" icon="pi pi-download" severity="secondary" [outlined]="true" (onClick)="downloadBasicTemplate()" />
        <p-button [label]="'products.btnDownloadAllTypes' | translate" icon="pi pi-download" severity="secondary" [outlined]="true" (onClick)="downloadTemplateWithTypes()" [pTooltip]="'products.tooltipAllTypes' | translate" tooltipPosition="top" />
      </div>
    </div>
  `,
  styles: [`
    .template-download-section { padding: 1rem; background: var(--surface-50); border-radius: var(--border-radius); }
    ul { padding-left: 1.5rem; }
    li { margin-bottom: 0.5rem; }
  `]
})
export class TemplateDownloadComponent {
  private readonly schemaService = inject(ProductSchemaService);

  downloadBasicTemplate(): void {
    this.schemaService.downloadTemplate();
  }

  downloadTemplateWithTypes(): void {
    this.schemaService.generateTemplateWithTypes();
  }
}
