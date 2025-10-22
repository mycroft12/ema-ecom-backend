import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CardModule } from 'primeng/card';
import { DropdownModule } from 'primeng/dropdown';
import { FileUpload, FileUploadModule } from 'primeng/fileupload';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { TabViewModule } from 'primeng/tabview';
import { StepperModule } from 'primeng/stepper';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { AuthService } from '../../core/auth.service';

type DomainKey = 'product' | 'employee' | 'delivery' | '';
type ConfigurationSource = 'dynamic' | 'google';

// @ts-ignore
// @ts-ignore
@Component({
  selector: 'app-import-template-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    CardModule,
    DropdownModule,
    FileUploadModule,
    ButtonModule,
    ConfirmDialogModule,
    ToastModule,
    TabViewModule,
    StepperModule,
    InputTextModule,
    MessageModule
  ],
  providers: [ConfirmationService, MessageService],
  styles: [
    `:host ::ng-deep {
        .google-stepper {
          width: min(100%, 50rem);
          margin-inline: auto;
        }

        .google-stepper .step-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          margin-top: 1.5rem;
        }

        .google-stepper .p-stepper-panels {
          padding-top: 0.5rem;
        }

        .google-stepper .p-message {
          margin-top: 1rem;
        }
      }`
  ],
  template: `
    <p-tabView [(activeIndex)]="activeTabIndex">
      <p-tabPanel [header]="'import.tabs.dynamic' | translate">
        <p-card [header]="('import.title' | translate)">
          <p class="mb-4">{{ 'import.description' | translate }}</p>

          <div class="grid p-fluid">
            <div class="col-12 md:col-4">
              <label for="domain" class="block mb-2">{{ 'import.domainLabel' | translate }}</label>
              <p-dropdown
                id="domain"
                [(ngModel)]="domain"
                name="domain"
                [options]="domainOptions"
                optionValue="value"
                optionDisabled="disabled"
                [placeholder]="('import.domainPlaceholder' | translate)"
                [showClear]="true"
              >
                <ng-template pTemplate="selectedItem" let-selected>
                  <div>{{ selected?.key | translate }}</div>
                </ng-template>
                <ng-template pTemplate="item" let-option>
                  <div class="flex align-items-center justify-content-between" [class.text-400]="isTableConfigured(option.value)">
                    <span>{{ option.key | translate }}</span>
                    <span *ngIf="isTableConfigured(option.value)" class="ml-2 text-xs bg-primary-100 text-primary-900 px-2 py-1 border-round">
                      {{ 'import.configured' | translate }}
                    </span>
                  </div>
                </ng-template>
              </p-dropdown>
            </div>

            <div class="col-12 md:col-8">
              <label class="block mb-2">{{ 'import.fileLabel' | translate }}</label>
              <div class="mb-2">
                <button pButton type="button" class="mr-2" [label]="('import.downloadExample' | translate)" icon="pi pi-download" severity="secondary" [outlined]="true" (click)="downloadExample()" [disabled]="!domain"></button>
              </div>
              <p-fileUpload
                #fileUpload
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
                [disabled]="isTableConfigured(domain)"
              >
              </p-fileUpload>
              <small *ngIf="isTableConfigured(domain)" class="p-error">
                <ng-container *ngIf="isAdmin; else nonAdminMessage">
                  {{ 'import.alreadyConfigured' | translate }}
                </ng-container>
                <ng-template #nonAdminMessage>
                  {{ 'import.alreadyConfiguredNonAdmin' | translate }}
                </ng-template>
              </small>
            </div>
          </div>

          <div *ngIf="loading" class="mt-3">
            <p class="p-text-secondary">
              <i class="pi pi-spin pi-spinner mr-2"></i>
              {{ 'import.loading' | translate }}
            </p>
          </div>

          <p class="p-error" *ngIf="error">{{ error | translate }}</p>

          <p *ngIf="success" class="mt-3" style="color: var(--green-500);">
            <i class="pi pi-check-circle mr-2"></i>
            {{ success | translate }}
          </p>
        </p-card>
      </p-tabPanel>
      <p-tabPanel [header]="'import.tabs.google' | translate">
        <p-card>
          <p class="mb-4">{{ 'import.google.intro' | translate }}</p>
          <p-stepper
            class="google-stepper"
            [linear]="true"
            [(value)]="googleStep"
            (valueChange)="onGoogleStepChange($event)"
          >
            <p-step-list>
              <p-step [value]="0">{{ 'import.google.step1Title' | translate }}</p-step>
              <p-step [value]="1">{{ 'import.google.step2Title' | translate }}</p-step>
            </p-step-list>
            <p-step-panels>
              <p-step-panel [value]="0">
                <ng-template #content let-activateCallback="activateCallback">
                  <p class="mb-3">{{ 'import.google.step1Description' | translate }}</p>
                  <div class="grid p-fluid">
                    <div class="col-12 md:col-6">
                      <label for="googleDomain" class="block mb-2">{{ 'import.google.componentLabel' | translate }}</label>
                      <p-dropdown
                        id="googleDomain"
                        [(ngModel)]="googleDomain"
                        [options]="componentOptions"
                        optionValue="value"
                        [placeholder]="('import.domainPlaceholder' | translate)"
                        (onChange)="clearGoogleError()"
                      >
                        <ng-template pTemplate="selectedItem" let-selected>
                          <div>{{ selected?.key | translate }}</div>
                        </ng-template>
                        <ng-template pTemplate="item" let-option>
                          <div class="flex align-items-center justify-content-between">
                            <span>{{ option.key | translate }}</span>
                          </div>
                        </ng-template>
                      </p-dropdown>
                    </div>
                  </div>
                  <div class="step-actions">
                    <button
                      pButton
                      type="button"
                      icon="pi pi-arrow-right"
                      iconPos="right"
                      [label]="'import.google.next' | translate"
                      (click)="handleGoogleNext(activateCallback)"
                      [disabled]="!googleDomain"
                    ></button>
                  </div>
                </ng-template>
              </p-step-panel>
              <p-step-panel [value]="1">
                <ng-template #content let-activateCallback="activateCallback">
                  <p class="mb-3">{{ 'import.google.step2Description' | translate }}</p>
                  <div class="grid p-fluid">
                    <div class="col-12 md:col-8">
                      <label for="googleSheetUrl" class="block mb-2">{{ 'import.google.sheetUrlLabel' | translate }}</label>
                      <input
                        id="googleSheetUrl"
                        pInputText
                        type="text"
                        [(ngModel)]="googleSheetUrl"
                        [placeholder]="'import.google.sheetUrlPlaceholder' | translate"
                        (ngModelChange)="clearGoogleError()"
                      />
                    </div>
                    <div class="col-12 md:col-4">
                      <label for="googleSheetName" class="block mb-2">{{ 'import.google.sheetTabLabel' | translate }}</label>
                      <input
                        id="googleSheetName"
                        pInputText
                        type="text"
                        [(ngModel)]="googleSheetName"
                        [placeholder]="'import.google.sheetTabPlaceholder' | translate"
                        (ngModelChange)="clearGoogleError()"
                      />
                    </div>
                  </div>
                  <p-message *ngIf="googleError" severity="error" [text]="googleError | translate"></p-message>
                  <div class="step-actions">
                    <button
                      pButton
                      type="button"
                      severity="secondary"
                      icon="pi pi-arrow-left"
                      [label]="'import.google.back' | translate"
                      (click)="handleGoogleBack(activateCallback)"
                      [disabled]="googleLoading"
                    ></button>
                    <button
                      pButton
                      type="button"
                      icon="pi pi-cloud-upload"
                      [label]="'import.google.connect' | translate"
                      (click)="submitGoogleImport(activateCallback)"
                      [loading]="googleLoading"
                      [disabled]="!canSubmitGoogleImport()"
                    ></button>
                  </div>
                </ng-template>
              </p-step-panel>
            </p-step-panels>
          </p-stepper>
        </p-card>
      </p-tabPanel>
      <p-tabPanel [header]="'import.tabs.configured' | translate">
        <div *ngIf="configuredTables.length === 0" class="py-4 text-600">
          {{ 'import.configuredEmpty' | translate }}
        </div>
        <div class="grid" *ngIf="configuredTables.length > 0">
          <div *ngFor="let configuredDomain of configuredTables" class="col-12 md:col-4 mb-3">
            <p-card>
              <ng-template pTemplate="header">
                <div class="flex align-items-center p-3">
                  <i class="pi pi-check-circle text-green-500 mr-2"></i>
                  <span class="font-bold">{{ getDomainDisplayName(configuredDomain) | translate }}</span>
                </div>
              </ng-template>
              <div class="p-3">
                <p>
                  {{ 'import.domainConfiguredSource' | translate: {
                    domain: (getDomainDisplayName(configuredDomain) | translate),
                    source: ((getConfigurationSourceKey(configuredDomain)) | translate)
                  } }}
                </p>
                <div class="mt-3 pt-3 border-top-1 surface-border">
                  <div class="flex align-items-center justify-content-between">
                    <button
                      pButton
                      type="button"
                      [label]="('import.resetTable' | translate)"
                      icon="pi pi-trash"
                      severity="danger"
                      (click)="resetTable(configuredDomain)"
                      size="small"
                    ></button>
                  </div>
                </div>
              </div>
            </p-card>
          </div>
        </div>
      </p-tabPanel>
    </p-tabView>

    <p-confirmDialog [style]="{width: '450px'}" [acceptLabel]="'common.yes' | translate" [rejectLabel]="'common.no' | translate"></p-confirmDialog>
    <p-toast></p-toast>
  `
})
export class ImportTemplatePageComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly translate = inject(TranslateService);
  private readonly auth = inject(AuthService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  @ViewChild('fileUpload') fileUpload!: FileUpload;

  domain: DomainKey = '';
  googleDomain: DomainKey = '';
  result: unknown;
  loading = false;
  error = '';
  success = '';
  configuredTables: DomainKey[] = [];
  configuredSources: Record<string, ConfigurationSource> = {};
  isAdmin = false;
  activeTabIndex = 0;
  googleStep = 0;
  googleSheetUrl = '';
  googleSheetName = '';
  googleLoading = false;
  googleError = '';

  ngOnInit(): void {
    this.isAdmin = this.auth.hasAny(['import:configure']);
    this.fetchConfiguredTables();
  }

  fetchConfiguredTables(): void {
    this.http.get<any[]>('/api/import/configure/tables').subscribe({
      next: (tables) => {
        const domains = tables.map(t => t.domain as DomainKey);
        this.configuredTables = domains;
        domains.forEach(domain => {
          if (!this.configuredSources[domain]) {
            this.configuredSources[domain] = 'dynamic';
          }
        });
      },
      error: (err) => {
        this.messageService.add({ 
          severity: 'error', 
          summary: this.translate.instant('import.error'), 
          detail: err?.error?.message || this.translate.instant('import.fetchTablesError') 
        });
      }
    });
  }

  isTableConfigured(domain: DomainKey): boolean {
    return this.configuredTables.includes(domain);
  }

  resetTable(domain: DomainKey): void {
    // if (!this.isAdmin) return;

    this.confirmationService.confirm({
      message: this.translate.instant('import.confirmReset'),
      header: this.translate.instant('import.confirmResetHeader'),
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.http.delete(`/api/import/configure/table`, { params: { domain } }).subscribe({
          next: () => {
            this.messageService.add({ 
              severity: 'success', 
              summary: this.translate.instant('import.success'), 
              detail: this.translate.instant('import.tableReset') 
            });
            this.configuredTables = this.configuredTables.filter(d => d !== domain);
            const updatedSources = { ...this.configuredSources };
            delete updatedSources[domain];
            this.configuredSources = updatedSources;
            this.fetchConfiguredTables();
          },
          error: (err) => {
            this.messageService.add({ 
              severity: 'error', 
              summary: this.translate.instant('import.error'), 
              detail: err?.error?.message || this.translate.instant('import.resetError') 
            });
          }
        });
      }
    });
  }

  /**
   * Returns the display name for a domain
   * @param domain The domain name (product, employee, delivery)
   * @returns The translation key for the domain display name
   */
  getDomainDisplayName(domain: DomainKey): string {
    const option = this.componentOptions.find(opt => opt.value === domain);
    return option ? option.key : domain;
  }

  readonly componentOptions: Array<{ key: string; value: DomainKey }> = [
    { key: 'import.domainProduct', value: 'product' },
    { key: 'import.domainEmployee', value: 'employee' },
    { key: 'import.domainDelivery', value: 'delivery' }
  ];

  get domainOptions() {
    return this.componentOptions.map(option => ({
      ...option,
      disabled: this.isTableConfigured(option.value)
    }));
  }

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
        this.messageService.add({ 
          severity: 'error', 
          summary: this.translate.instant('import.error'), 
          detail: err?.error?.message || this.translate.instant('import.downloadError') 
        });
      }
    });
  }

  onUpload(event: any){
    this.error = '';
    this.success = '';
    const file: File | undefined = event?.files?.[0];
    if (!file || !this.domain) {
      this.error = !this.domain ? 'import.domainPlaceholder' : 'import.error';
      return;
    }

    // Get the display name of the domain for the confirmation message
    const domainDisplayName = this.translate.instant(this.getDomainDisplayName(this.domain));

    // Show confirmation dialog before proceeding
    this.confirmationService.confirm({
      message: this.translate.instant('import.confirmUpload', { domain: domainDisplayName }),
      header: this.translate.instant('import.confirmUploadHeader'),
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        // User confirmed, proceed with upload
        const selectedDomain = this.domain;
        const form = new FormData();
        form.append('file', file);
        form.append('domain', selectedDomain);
        this.loading = true;
        this.http.post('/api/import/configure', form).subscribe({
          next: (res) => { 
            this.result = res; 
            this.loading = false; 
            this.success = 'import.success';

            // Update the configuredTables array if the domain is not already in it
            if (!this.configuredTables.includes(selectedDomain)) {
              this.configuredTables = [...this.configuredTables, selectedDomain];
            }
            this.configuredSources = { ...this.configuredSources, [selectedDomain]: 'dynamic' };

            // Clear the file upload component
            if (this.fileUpload) {
              this.fileUpload.clear();
            }

            // Clear the domain dropdown
            this.domain = '';
          },
          error: (err) => { 
            this.error = err?.error?.message || 'import.error'; 
            this.loading = false; 
            this.messageService.add({ 
              severity: 'error', 
              summary: this.translate.instant('import.error'), 
              detail: err?.error?.message || this.translate.instant('import.uploadError') 
            });
          }
        });
      }
    });
  }

  onFilesCleared(){ this.result = undefined; this.error = ''; this.success = ''; }
  onFileRemoved(){ this.result = undefined; this.error = ''; this.success = ''; }

  onGoogleStepChange(step: number | undefined): void {
    this.googleStep = typeof step === 'number' ? step : 0;
  }

  handleGoogleNext(activate: (step: number) => void): void {
    if (!this.googleDomain) {
      this.googleError = 'import.google.domainRequired';
      return;
    }
    this.googleError = '';
    this.googleStep = 1;
    activate(1);
  }

  handleGoogleBack(activate: (step: number) => void): void {
    this.googleError = '';
    this.googleStep = 0;
    activate(0);
  }

  canSubmitGoogleImport(): boolean {
    return !!this.googleDomain && !!this.googleSheetUrl.trim() && !this.googleLoading;
  }

  submitGoogleImport(activateCallback?: (step: number) => void): void {
    if (!this.googleDomain) {
      this.googleError = 'import.google.domainRequired';
      return;
    }
    if (!this.googleSheetUrl.trim()) {
      this.googleError = 'import.google.sheetRequired';
      return;
    }

    this.googleLoading = true;
    this.googleError = '';
    const targetDomain = this.googleDomain;
    setTimeout(() => {
      this.googleLoading = false;
      if (!targetDomain) {
        return;
      }
      if (!this.configuredTables.includes(targetDomain)) {
        this.configuredTables = [...this.configuredTables, targetDomain];
      }
      this.configuredSources = { ...this.configuredSources, [targetDomain]: 'google' };
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('import.success'),
        detail: this.translate.instant('import.google.successDetail')
      });
      this.googleDomain = '';
      this.googleSheetUrl = '';
      this.googleSheetName = '';
      this.googleStep = 0;
      activateCallback?.(0);
      this.activeTabIndex = 2;
    }, 600);
  }

  clearGoogleError(): void {
    this.googleError = '';
  }

  private getConfigurationSource(domain: DomainKey): ConfigurationSource {
    return this.configuredSources[domain] ?? 'dynamic';
  }

  getConfigurationSourceKey(domain: DomainKey): string {
    return `import.configuredSource.${this.getConfigurationSource(domain)}`;
  }

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
