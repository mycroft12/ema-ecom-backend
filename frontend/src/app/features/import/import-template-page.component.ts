import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CardModule } from 'primeng/card';
import { DropdownModule } from 'primeng/dropdown';
import { FileUploadModule } from 'primeng/fileupload';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-import-template-page',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, CardModule, DropdownModule, FileUploadModule, ButtonModule],
  template: `
    <p-card [header]="('import.title' | translate)">
      <p class="mb-4">{{ 'import.description' | translate }}</p>

      <div class="grid p-fluid">
        <div class="col-12 md:col-4">
          <label for="domain" class="block mb-2">{{ 'import.domainLabel' | translate }}</label>
          <p-dropdown
            id="domain"
            [(ngModel)]="domain"
            name="domain"
            [options]="componentOptions"
            optionValue="value"
            [placeholder]="('import.domainPlaceholder' | translate)"
            [showClear]="true"
          >
            <ng-template pTemplate="selectedItem" let-selected>
              <div>{{ selected?.key | translate }}</div>
            </ng-template>
            <ng-template pTemplate="item" let-option>
              <div>{{ option.key | translate }}</div>
            </ng-template>
          </p-dropdown>
        </div>

        <div class="col-12 md:col-8">
          <label class="block mb-2">{{ 'import.fileLabel' | translate }}</label>
          <div class="mb-2">
            <button pButton type="button" class="mr-2" [label]="('import.downloadExample' | translate)" icon="pi pi-download" severity="secondary" [outlined]="true" (click)="downloadExample()" [disabled]="!domain"></button>
          </div>
          <p-fileUpload
            mode="advanced"
            [customUpload]="true"
            accept=".xlsx,.xls,.csv"
            [maxFileSize]="10000000"
            [chooseLabel]="('import.chooseLabel' | translate)"
            [uploadLabel]="('import.uploadLabel' | translate)"
            [cancelLabel]="('import.cancelLabel' | translate)"
            (uploadHandler)="onUpload($event)"
            (onRemove)="onFileRemoved()"
            (onClear)="onFilesCleared()"
          >
          </p-fileUpload>
        </div>
      </div>

      <p class="p-error" *ngIf="error">{{ error | translate }}</p>

      <div *ngIf="result" class="mt-3">
        <h3>{{ 'import.resultTitle' | translate }}</h3>
        <div style="max-height: calc(1.5rem * 10); overflow-y: auto; border: 1px solid var(--surface-300); border-radius: var(--border-radius); padding: .5rem; background: var(--surface-card);">
          <pre style="margin:0; line-height: 1.5; white-space: pre-wrap;">{{ result | json }}</pre>
        </div>
      </div>
    </p-card>
  `
})
export class ImportTemplatePageComponent{
  private readonly http = inject(HttpClient);
  private readonly translate = inject(TranslateService);

  domain: 'product' | 'employee' | 'delivery' | '' = '';
  result: unknown;
  loading = false;
  error = '';

  componentOptions = [
    { key: 'import.domainProduct', value: 'product' },
    { key: 'import.domainEmployee', value: 'employee' },
    { key: 'import.domainDelivery', value: 'delivery' }
  ];

  downloadExample(){
    this.error = '';
    if (!this.domain) {
      this.error = 'import.selectComponentFirst';
      return;
    }
    this.http.get(`/api/import/configure/template-example`, { params: { domain: this.domain }, observe: 'response', responseType: 'blob' as const }).subscribe({
      next: (res) => {
        const blob = res.body!;
        const cd = res.headers.get('content-disposition');
        const filename = this.extractFilename(cd) || `${this.domain}-template-example.csv`;
        this.download(blob, filename);
      },
      error: (err) => {
        this.error = err?.error?.message || 'import.error';
      }
    });
  }

  onUpload(event: any){
    this.error = '';
    const file: File | undefined = event?.files?.[0];
    if (!file || !this.domain) {
      this.error = !this.domain ? 'import.domainPlaceholder' : 'import.error';
      return;
    }
    const form = new FormData();
    form.append('file', file);
    form.append('domain', this.domain);
    this.loading = true;
    this.http.post('/api/import/configure', form).subscribe({
      next: (res) => { this.result = res; this.loading = false; },
      error: (err) => { this.error = err?.error?.message || 'import.error'; this.loading = false; }
    });
  }

  onFilesCleared(){ this.result = undefined; this.error = ''; }
  onFileRemoved(){ this.result = undefined; this.error = ''; }

  private download(blob: Blob, filename: string){
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  private extractFilename(cd: string | null): string | null {
    if (!cd) return null;
    const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(cd);
    return matches && matches[1] ? matches[1].replace(/['"]/g, '') : null;
  }
}
