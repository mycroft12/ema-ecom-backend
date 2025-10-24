import { Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
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
import { DialogModule } from 'primeng/dialog';
import { AuthService } from '../../core/auth.service';

type DomainKey = 'product' | 'employee' | 'delivery' | '';
type ConfigurationSource = 'dynamic' | 'google';

interface GoogleSheetConnectResponse {
  configured: boolean;
}

interface ConfiguredTableResponse {
  domain: DomainKey;
  tableName: string;
  rowCount: number;
  source?: ConfigurationSource;
}

interface GoogleServiceAccountStatus {
  configured: boolean;
  clientEmail?: string;
  projectId?: string;
  updatedAt?: string;
}

interface GoogleSheetTestResponseDto {
  headers: string[];
  typeRow: string[];
  dataRowCount: number;
}

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
    MessageModule,
    DialogModule
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

        .google-help-link {
          color: #1d4ed8;
          font-weight: 600;
          cursor: pointer;
        }

        .google-help-link:hover {
          text-decoration: underline;
        }

        .google-sheet-url {
          min-height: 3rem;
          width: 100%;
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

          <div class="surface-0 border-1 border-round surface-border p-3 mb-4">
            <div class="flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-3">
              <div>
                <div class="font-bold mb-1">{{ 'import.google.serviceAccountTitle' | translate }}</div>
                <ng-container *ngIf="googleServiceAccount?.configured; else googleServiceAccountUpload">
                  <div class="text-600">
                    {{ 'import.google.serviceAccountConfigured' | translate:{ email: googleServiceAccount?.clientEmail || '—' } }}
                  </div>
                  <div class="text-sm text-500" *ngIf="googleServiceAccount?.projectId">
                    {{ 'import.google.serviceAccountProject' | translate:{ project: googleServiceAccount?.projectId } }}
                  </div>
                  <div class="text-sm text-500" *ngIf="googleServiceAccount?.updatedAt">
                    {{ 'import.google.serviceAccountUpdatedAt' | translate:{ date: (googleServiceAccount?.updatedAt | date:'medium') } }}
                  </div>
                </ng-container>
                <ng-template #googleServiceAccountUpload>
                  <p class="text-600 mb-0">{{ 'import.google.uploadCredentialHint' | translate }}</p>
                </ng-template>
              </div>
              <button
                pButton
                type="button"
                class="p-button-text"
                [label]="'import.google.howTo' | translate"
                (click)="showInstructionsDialog = true"
              ></button>
              <div class="flex gap-2 flex-wrap" *ngIf="canManageGoogleIntegration; else googleServiceAccountViewOnly">
                <button
                  pButton
                  type="button"
                  icon="pi pi-upload"
                  [label]="(googleServiceAccount?.configured ? 'import.google.replaceCredentials' : 'import.google.uploadCredentials') | translate"
                  (click)="triggerServiceAccountUpload()"
                  [disabled]="googleCredentialsUploading"
                  [loading]="googleCredentialsUploading"
                ></button>
                <button
                  pButton
                  type="button"
                  icon="pi pi-trash"
                  severity="danger"
                  [label]="'import.google.removeCredentials' | translate"
                  (click)="removeServiceAccount()"
                  [disabled]="!googleServiceAccount?.configured || googleCredentialsUploading"
                ></button>
              </div>
              <ng-template #googleServiceAccountViewOnly>
                <p class="text-600 mb-0">{{ 'import.google.serviceAccountReadOnly' | translate }}</p>
              </ng-template>
            </div>
            <input #serviceAccountFile type="file" accept="application/json" class="hidden"
                   (change)="onServiceAccountFileSelected($event, serviceAccountFile)">
            <p-message *ngIf="googleCredentialsError" severity="error" [text]="googleCredentialsError"></p-message>
          </div>

          <p-stepper class="google-stepper" [linear]="true" [(value)]="googleStep" (valueChange)="onGoogleStepChange($event)">
            <p-step-list>
              <p-step [value]="0">{{ 'import.google.step1Title' | translate }}</p-step>
              <p-step [value]="1">{{ 'import.google.step2Title' | translate }}</p-step>
            </p-step-list>
            <p-step-panels>
              <p-step-panel [value]="0">
                <ng-template pTemplate="content" let-activateCallback="activateCallback">
                  <p class="mb-3">{{ 'import.google.step1Description' | translate }}</p>
                  <label for="googleDomain" class="block mb-2">{{ 'import.domainLabel' | translate }}</label>
                  <p-dropdown
                    id="googleDomain"
                    class="w-full md:w-6"
                    [(ngModel)]="googleDomain"
                    [options]="googleDomainOptions"
                    optionValue="value"
                    optionDisabled="disabled"
                    [placeholder]="('import.domainPlaceholder' | translate)"
                    [showClear]="true"
                    (onChange)="clearGoogleError()"
                    [disabled]="!googleServiceAccount?.configured"
                  >
                    <ng-template pTemplate="selectedItem" let-selected>
                      <div *ngIf="selected" class="flex align-items-center justify-content-between">
                        <span>{{ selected.key | translate }}</span>
                        <span *ngIf="selected.configured" class="ml-2 text-xs bg-primary-100 text-primary-900 px-2 py-1 border-round">
                          {{ 'import.configured' | translate }}
                        </span>
                      </div>
                    </ng-template>
                    <ng-template pTemplate="item" let-option>
                      <div class="flex align-items-center justify-content-between" [class.text-400]="option.configured">
                        <span>{{ option.key | translate }}</span>
                        <span *ngIf="option.configured" class="ml-2 text-xs bg-primary-100 text-primary-900 px-2 py-1 border-round">
                          {{ 'import.configured' | translate }}
                        </span>
                      </div>
                    </ng-template>
                  </p-dropdown>
                  <div class="step-actions">
                    <button
                      pButton
                      type="button"
                      icon="pi pi-arrow-right"
                      iconPos="right"
                      [label]="'import.google.next' | translate"
                      (click)="handleGoogleNext(activateCallback)"
                      [disabled]="!googleDomain || !googleServiceAccount?.configured"
                    ></button>
                  </div>
                </ng-template>
              </p-step-panel>
              <p-step-panel [value]="1">
                <ng-template pTemplate="content" let-activateCallback="activateCallback">
                  <p class="mb-3">{{ 'import.google.step2Description' | translate }}</p>
                  <p-message *ngIf="!googleServiceAccount?.configured" severity="warn" [text]="'import.google.serviceAccountMissing' | translate"></p-message>
                  <div class="grid p-fluid">
                    <div class="col-12 md:col-8">
                      <label for="googleSheetUrl" class="block mb-2">{{ 'import.google.sheetUrlLabel' | translate }}</label>
                      <input
                        id="googleSheetUrl"
                        class="google-sheet-url"
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
                  <div class="flex align-items-center gap-2 mt-3 flex-wrap">
                    <button
                      pButton
                      type="button"
                      icon="pi pi-search"
                      [label]="'import.google.testConnection' | translate"
                      (click)="testGoogleSheet()"
                      [disabled]="!googleServiceAccount?.configured || !googleSheetUrl.trim()"
                      [loading]="googleTestLoading"
                    ></button>
                    <span class="text-sm text-600" *ngIf="googleTestRows > 0">
                      {{ 'import.google.testResultSummary' | translate:{ rows: googleTestRows } }}
                    </span>
                  </div>
                  <div class="surface-100 border-round p-3 mt-3" *ngIf="googleTestHeaders.length > 0">
                    <div class="text-sm text-600 mb-1">{{ 'import.google.headers' | translate }}</div>
                    <div class="text-sm">{{ googleTestHeaders.join(', ') }}</div>
                    <div class="text-sm text-600 mt-2" *ngIf="googleTestTypes.length > 0">{{ 'import.google.types' | translate }}</div>
                    <div class="text-sm" *ngIf="googleTestTypes.length > 0">{{ googleTestTypes.join(', ') }}</div>
                  </div>
                  <p-message *ngIf="googleErrorMessage" severity="error" [text]="googleErrorMessage"></p-message>
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
    <p-dialog
      [(visible)]="showInstructionsDialog"
      [modal]="true"
      [closable]="true"
      [style]="{ width: '30rem' }"
      [breakpoints]="{'960px': '75vw', '640px': '95vw'}"
      [header]="'import.google.howToTitle' | translate"
    >
      <ol class="pl-3">
        <li [innerHTML]="'import.google.howToStep1' | translate"></li>
        <li [innerHTML]="'import.google.howToStep2' | translate"></li>
        <li [innerHTML]="'import.google.howToStep3' | translate"></li>
        <li [innerHTML]="'import.google.howToStep4' | translate"></li>
        <li [innerHTML]="'import.google.howToStep5' | translate"></li>
      </ol>
      <ng-template pTemplate="footer">
        <button pButton type="button" class="p-button-text" [label]="'common.close' | translate" (click)="showInstructionsDialog = false"></button>
      </ng-template>
    </p-dialog>
  `
})
export class ImportTemplatePageComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly translate = inject(TranslateService);
  private readonly auth = inject(AuthService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  @ViewChild('fileUpload') fileUpload!: FileUpload;
  @ViewChild('serviceAccountFile') serviceAccountFileInput?: ElementRef<HTMLInputElement>;

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
  googleErrorMessage = '';

  googleServiceAccount: GoogleServiceAccountStatus | null = null;
  googleCredentialsUploading = false;
  googleCredentialsError = '';
  googleTestHeaders: string[] = [];
  googleTestTypes: string[] = [];
  googleTestRows = 0;
  googleTestLoading = false;
  canManageGoogleIntegration = false;
  showInstructionsDialog = false;

  readonly componentOptions: Array<{ key: string; value: DomainKey }> = [
    { key: 'import.domainProduct', value: 'product' },
    { key: 'import.domainEmployee', value: 'employee' },
    { key: 'import.domainDelivery', value: 'delivery' }
  ];

  ngOnInit(): void {
    this.isAdmin = this.auth.hasAny(['import:configure']);
    this.canManageGoogleIntegration = this.auth.hasAny(['google-sheet:access']);
    this.fetchConfiguredTables();
    if (this.canManageGoogleIntegration) {
      this.fetchServiceAccountStatus();
    }
  }

  fetchConfiguredTables(): void {
    this.http.get<ConfiguredTableResponse[]>('/api/import/configure/tables').subscribe({
      next: (tables) => {
        const domains = tables.map(t => t.domain as DomainKey);
        this.configuredTables = domains;
        const nextSources: Record<string, ConfigurationSource> = {};
        tables.forEach(table => {
          const domain = table.domain as DomainKey;
          const source = (table as { source?: ConfigurationSource }).source;
          nextSources[domain] = source === 'google' ? 'google' : 'dynamic';
        });
        this.configuredSources = nextSources;
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

  private fetchServiceAccountStatus(): void {
    this.http.get<GoogleServiceAccountStatus>('/api/integrations/google/sheets/service-account').subscribe({
      next: (status) => {
        this.googleServiceAccount = status;
      },
      error: (err) => {
        this.googleServiceAccount = { configured: false };
        if (err?.status === 403) {
          this.canManageGoogleIntegration = false;
        } else {
          this.messageService.add({
            severity: 'warn',
            summary: this.translate.instant('import.error'),
            detail: err?.error?.message || this.translate.instant('import.google.credentialsStatusError')
          });
        }
      }
    });
  }

  triggerServiceAccountUpload(): void {
    if (!this.canManageGoogleIntegration || this.googleCredentialsUploading) {
      return;
    }
    const input = this.serviceAccountFileInput?.nativeElement;
    if (input) {
      input.value = '';
      input.click();
    }
  }

  onServiceAccountFileSelected(event: Event, input: HTMLInputElement): void {
    if (!this.canManageGoogleIntegration) {
      return;
    }
    const file = (event.target as HTMLInputElement)?.files?.[0];
    if (!file) {
      return;
    }
    const formData = new FormData();
    formData.append('file', file, file.name);
    this.googleCredentialsUploading = true;
    this.googleCredentialsError = '';
    this.http.post<GoogleServiceAccountStatus>('/api/integrations/google/sheets/service-account', formData).subscribe({
      next: (status) => {
        this.googleCredentialsUploading = false;
        this.googleServiceAccount = status;
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('import.success'),
          detail: this.translate.instant('import.google.credentialsUploaded')
        });
      },
      error: (err) => {
        this.googleCredentialsUploading = false;
        this.googleCredentialsError = err?.error?.message || this.translate.instant('import.google.credentialsUploadError');
      }
    });
    input.value = '';
  }

  removeServiceAccount(): void {
    if (!this.canManageGoogleIntegration || !this.googleServiceAccount?.configured) {
      return;
    }
    this.confirmationService.confirm({
      message: this.translate.instant('import.google.removeCredentialsConfirm'),
      header: this.translate.instant('import.google.serviceAccountTitle'),
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.googleCredentialsUploading = true;
        this.http.delete<void>('/api/integrations/google/sheets/service-account').subscribe({
          next: () => {
            this.googleCredentialsUploading = false;
            this.googleServiceAccount = { configured: false };
            this.googleTestHeaders = [];
            this.googleTestTypes = [];
            this.googleTestRows = 0;
            this.messageService.add({
              severity: 'success',
              summary: this.translate.instant('import.success'),
              detail: this.translate.instant('import.google.credentialsRemoved')
            });
          },
          error: (err) => {
            this.googleCredentialsUploading = false;
            this.messageService.add({
              severity: 'error',
              summary: this.translate.instant('import.error'),
              detail: err?.error?.message || this.translate.instant('import.google.credentialsRemoveError')
            });
          }
        });
      }
    });
  }

  get domainOptions() {
    return this.componentOptions.map(option => ({
      ...option,
      disabled: this.isTableConfigured(option.value) || !this.googleServiceAccount?.configured
    }));
  }

  get googleDomainOptions() {
    return this.componentOptions.map(option => ({
      ...option,
      configured: this.isTableConfigured(option.value),
      disabled: this.isTableConfigured(option.value) || !this.googleServiceAccount?.configured
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

    const domainDisplayName = this.translate.instant(this.getDomainDisplayName(this.domain));

    this.confirmationService.confirm({
      message: this.translate.instant('import.confirmUpload', { domain: domainDisplayName }),
      header: this.translate.instant('import.confirmUploadHeader'),
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
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
            if (!this.configuredTables.includes(selectedDomain)) {
              this.configuredTables = [...this.configuredTables, selectedDomain];
            }
            this.configuredSources = { ...this.configuredSources, [selectedDomain]: 'dynamic' };
            if (this.fileUpload) {
              this.fileUpload.clear();
            }
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
      this.googleErrorMessage = this.translate.instant('import.google.domainRequired');
      return;
    }
    if (!this.googleServiceAccount?.configured) {
      this.googleErrorMessage = this.translate.instant('import.google.serviceAccountMissing');
      return;
    }
    this.googleErrorMessage = '';
    this.googleStep = 1;
    activate(1);
  }

  handleGoogleBack(activate: (step: number) => void): void {
    this.googleErrorMessage = '';
    this.googleStep = 0;
    activate(0);
  }

  canSubmitGoogleImport(): boolean {
    return !!this.googleDomain && !!this.googleSheetUrl.trim() && !!this.googleServiceAccount?.configured && !this.googleLoading;
  }

  submitGoogleImport(activateCallback?: (step: number) => void): void {
    if (!this.googleDomain) {
      this.googleErrorMessage = this.translate.instant('import.google.domainRequired');
      return;
    }
    if (!this.googleServiceAccount?.configured) {
      this.googleErrorMessage = this.translate.instant('import.google.serviceAccountMissing');
      return;
    }
    if (!this.googleSheetUrl.trim()) {
      this.googleErrorMessage = this.translate.instant('import.google.sheetRequired');
      return;
    }

    const spreadsheetId = this.extractSpreadsheetId(this.googleSheetUrl);
    const trimmedTabName = this.googleSheetName.trim();
    const requestBody = {
      domain: this.googleDomain,
      spreadsheetId,
      sheetUrl: this.googleSheetUrl.trim(),
      tabName: trimmedTabName ? trimmedTabName : null
    };

    this.googleLoading = true;
    this.googleErrorMessage = '';
    const targetDomain = this.googleDomain;

    this.http.post<GoogleSheetConnectResponse>('/api/import/google/connect', requestBody).subscribe({
      next: (response) => {
        this.googleLoading = false;
        if (!response?.configured) {
          this.messageService.add({
            severity: 'warn',
            summary: this.translate.instant('import.error'),
            detail: this.translate.instant('import.google.connectError')
          });
          return;
        }
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
        this.fetchConfiguredTables();
        this.googleDomain = '';
        this.googleSheetUrl = '';
        this.googleSheetName = '';
        this.googleTestHeaders = [];
        this.googleTestTypes = [];
        this.googleTestRows = 0;
        this.googleStep = 0;
        activateCallback?.(0);
        this.activeTabIndex = 2;
      },
      error: (err) => {
        this.googleLoading = false;
        const detail = err?.error?.message || err?.error?.detail || this.translate.instant('import.google.connectError');
        this.googleErrorMessage = detail;
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('import.error'),
          detail
        });
      }
    });
  }

  testGoogleSheet(): void {
    if (!this.googleServiceAccount?.configured || !this.googleSheetUrl.trim()) {
      return;
    }
    const spreadsheetId = this.extractSpreadsheetId(this.googleSheetUrl);
    this.googleTestLoading = true;
    this.googleErrorMessage = '';
    this.http.post<GoogleSheetTestResponseDto>('/api/integrations/google/sheets/test', {
      spreadsheetId,
      tabName: this.googleSheetName.trim() ? this.googleSheetName.trim() : null
    }).subscribe({
      next: (response) => {
        this.googleTestLoading = false;
        this.googleTestHeaders = response.headers ?? [];
        this.googleTestTypes = response.typeRow ?? [];
        this.googleTestRows = response.dataRowCount ?? 0;
      },
      error: (err) => {
        this.googleTestLoading = false;
        this.googleTestHeaders = [];
        this.googleTestTypes = [];
        this.googleTestRows = 0;
        this.googleErrorMessage = err?.error?.message || this.translate.instant('import.google.testConnectionError');
      }
    });
  }

  private extractSpreadsheetId(input: string): string {
    const trimmed = (input || '').trim();
    const match = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/.exec(trimmed);
    return match ? match[1] : trimmed;
  }

  clearGoogleError(): void {
    this.googleErrorMessage = '';
  }

  isTableConfigured(domain: DomainKey): boolean {
    return this.configuredTables.includes(domain);
  }

  resetTable(domain: DomainKey): void {
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

  getDomainDisplayName(domain: DomainKey): string {
    const option = this.componentOptions.find(opt => opt.value === domain);
    return option ? option.key : domain;
  }

  getConfigurationSourceKey(domain: DomainKey): string {
    return `import.configuredSource.${this.configuredSources[domain] ?? 'dynamic'}`;
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
