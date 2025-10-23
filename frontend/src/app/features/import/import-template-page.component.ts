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
import { DialogModule } from 'primeng/dialog';
import { AuthService } from '../../core/auth.service';
import { environment } from '../../../environments/environment';

declare const google: any;
declare const gapi: any;

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

interface GoogleDriveFile {
  id: string;
  name: string;
  url: string;
}

interface GoogleSheetMetadata {
  sheetId: number | null;
  title: string;
  index: number | null;
}

interface GoogleIntegrationConfig {
  clientId: string | null;
  apiKey: string | null;
  configured: boolean;
}

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

        .google-config-link {
          color: var(--primary-color);
          text-decoration: none;
        }

        .google-config-link:hover {
          text-decoration: underline;
        }

        .google-config-badge {
          display: inline-block;
          padding: 0.15rem 0.4rem;
          background: var(--surface-200);
          border-radius: 999px;
          font-size: 0.85rem;
          margin: 0 0.25rem;
        }

        .google-config-steps {
          margin: 0 0 1rem 0;
          padding-inline-start: 1.5rem;
        }

        :host(:dir(rtl)) .google-config-steps {
          padding-inline-start: 0;
          padding-inline-end: 1.5rem;
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
          <p-stepper class="google-stepper" [linear]="true" [(value)]="googleStep"
            (valueChange)="onGoogleStepChange($event)" >
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
                      [disabled]="!googleDomain"
                    ></button>
                  </div>
                </ng-template>
              </p-step-panel>
              <p-step-panel [value]="1">
                <ng-template pTemplate="content" let-activateCallback="activateCallback">
                  <p class="mb-3">{{ 'import.google.step2Description' | translate }}</p>
                  <div class="grid p-fluid">
                    <div class="col-12" *ngIf="canManageGoogleIntegration">
                      <button
                        pButton
                        type="button"
                        icon="pi pi-cog"
                        class="mr-2"
                        severity="secondary"
                        [label]="'import.google.configureButton' | translate"
                        (click)="openGoogleConfigDialog()"
                      ></button>
                    </div>
                    <div class="col-12">
                      <button
                        pButton
                        type="button"
                        icon="pi pi-google"
                        class="mr-2"
                        [label]="'import.google.pickerButton' | translate"
                        (click)="openDrivePicker()"
                        [disabled]="googleLoading || !googlePickerReady"
                      ></button>
                      <span class="text-600 text-sm" *ngIf="!googlePickerReady && !googlePickerError">
                        {{ 'import.google.pickerLoading' | translate }}
                      </span>
                      <p-message *ngIf="googlePickerError" severity="warn" [text]="googlePickerError | translate"></p-message>
                    </div>
                    <div class="col-12" *ngIf="selectedSpreadsheet as file">
                      <div class="surface-100 border-round p-3 flex align-items-center justify-content-between flex-wrap gap-3">
                        <div>
                          <div class="font-bold">{{ file.name }}</div>
                          <div class="text-sm text-600">{{ 'import.google.selectedFile' | translate }}</div>
                        </div>
                        <a [href]="file.url" target="_blank" rel="noopener" class="text-primary text-sm">
                          {{ 'import.google.openInSheets' | translate }}
                        </a>
                      </div>
                    </div>
                    <div class="col-12 md:col-6" *ngIf="selectedSpreadsheet">
                      <label for="googleSheetName" class="block mb-2">{{ 'import.google.sheetTabLabel' | translate }}</label>
                      <p-dropdown
                        id="googleSheetName"
                        class="w-full"
                        [options]="googleSheetOptions"
                        optionLabel="label"
                        optionValue="value"
                        [(ngModel)]="googleSheetName"
                        [placeholder]="'import.google.sheetTabPlaceholder' | translate"
                        (onChange)="onSheetSelected($event.value)"
                        [disabled]="googleFileLoading"
                      ></p-dropdown>
                      <div class="text-600 text-sm mt-2" *ngIf="googleFileLoading">
                        <i class="pi pi-spin pi-spinner mr-2"></i>{{ 'import.google.loadingSheets' | translate }}
                      </div>
                    </div>
                    <div class="col-12" *ngIf="selectedSpreadsheet">
                      <p-message severity="info" [text]="'import.google.shareHint' | translate"></p-message>
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
    <p-dialog
      [(visible)]="showGoogleConfigDialog"
      [modal]="true"
      [closable]="false"
      [breakpoints]="{'960px': '75vw', '640px': '95vw'}"
      [style]="{ width: '30rem' }"
      [header]="'import.google.configDialogTitle' | translate"
    >
      <p class="mb-3 text-600" [innerHTML]="'import.google.configDialogDescription' | translate"></p>
      <div class="p-fluid formgrid grid">
        <div class="field col-12">
          <label for="googleClientId" class="block mb-2">{{ 'import.google.clientIdLabel' | translate }}</label>
          <input
            id="googleClientId"
            pInputText
            type="text"
            [(ngModel)]="googleConfigForm.clientId"
            autocomplete="off"
            [disabled]="googleConfigSaving"
          />
        </div>
        <div class="field col-12">
          <label for="googleApiKey" class="block mb-2">{{ 'import.google.apiKeyLabel' | translate }}</label>
          <input
            id="googleApiKey"
            pInputText
            type="text"
            [(ngModel)]="googleConfigForm.apiKey"
            autocomplete="off"
            [disabled]="googleConfigSaving"
          />
        </div>
      </div>
      <ng-template pTemplate="footer">
        <button
          pButton
          type="button"
          class="p-button-text"
          [label]="'common.cancel' | translate"
          (click)="closeGoogleConfigDialog()"
          [disabled]="googleConfigSaving"
        ></button>
        <button
          pButton
          type="button"
          icon="pi pi-save"
          [label]="'common.save' | translate"
          (click)="saveGoogleIntegrationConfig()"
          [loading]="googleConfigSaving"
        ></button>
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
  googlePickerReady = false;
  googlePickerError = '';
  googleFileLoading = false;
  selectedSpreadsheet: GoogleDriveFile | null = null;
  availableSheets: GoogleSheetMetadata[] = [];
  canManageGoogleIntegration = false;
  showGoogleConfigDialog = false;
  googleConfigSaving = false;
  googleConfigForm: { clientId: string; apiKey: string } = { clientId: '', apiKey: '' };
  googleConfigLoaded = false;
  private pickerTokenClient: any = null;
  private oauthToken: string | null = null;
  private pickerApiLoaded = false;
  private gsiLoaded = false;
  private pendingPickerOpen = false;
  private googleScriptsRequested = false;
  private googleClientId: string | null = environment.googlePickerClientId || null;
  private googleApiKey: string | null = environment.googlePickerApiKey || null;
  private readonly googleMimeTypes = environment.googleDriveMimeTypes || 'application/vnd.google-apps.spreadsheet,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv';
  private readonly pickerScopes = ['https://www.googleapis.com/auth/drive.readonly'];

  ngOnInit(): void {
    this.isAdmin = this.auth.hasAny(['import:configure']);
    this.canManageGoogleIntegration = this.auth.hasAny(['google-sheet:access']);
    this.fetchConfiguredTables();
    this.loadGoogleIntegrationConfig();
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

  private loadGoogleIntegrationConfig(): void {
    this.http.get<GoogleIntegrationConfig>('/api/import/google/config').subscribe({
      next: (config) => {
        this.googleConfigLoaded = true;
        const fallbackClientId = environment.googlePickerClientId || null;
        const fallbackApiKey = environment.googlePickerApiKey || null;
        this.googleClientId = (config?.clientId ?? fallbackClientId) || null;
        this.googleApiKey = (config?.apiKey ?? fallbackApiKey) || null;
        if (this.googleClientId && this.googleApiKey) {
          this.resetPickerState();
          this.initializeGooglePicker();
          this.googlePickerError = '';
        } else {
          this.googlePickerError = 'import.google.missingConfig';
        }
      },
      error: (err) => {
        this.googleConfigLoaded = true;
        const detail = err?.error?.message || this.translate.instant('import.google.configFetchError');
        this.googlePickerError = 'import.google.configFetchError';
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('import.error'),
          detail
        });
      }
    });
  }

  private initializeGooglePicker(): void {
    if (!this.googleClientId || !this.googleApiKey) {
      this.googlePickerError = 'import.google.missingConfig';
      return;
    }
    if (this.googleScriptsRequested) {
      return;
    }
    this.googleScriptsRequested = true;
    this.appendScript('https://accounts.google.com/gsi/client', () => {
      this.gsiLoaded = true;
      this.initializeTokenClient();
    });
    this.appendScript('https://apis.google.com/js/api.js', () => {
      if (typeof gapi !== 'undefined' && gapi.load) {
        gapi.load('client:picker', {
          callback: () => {
            this.pickerApiLoaded = true;
            this.tryEnablePicker();
          },
          onerror: () => {
            this.googlePickerError = 'import.google.pickerNotReady';
          }
        });
      }
    });
  }

  private appendScript(src: string, onLoad: () => void): void {
    if (document.querySelector(`script[src="${src}"]`)) {
      onLoad();
      return;
    }
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = onLoad;
    script.onerror = () => {
      this.googlePickerError = 'import.google.pickerNotReady';
    };
    document.head.appendChild(script);
  }

  private initializeTokenClient(): void {
    if (!this.googleClientId) {
      return;
    }
    if (typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2) {
      return;
    }
    this.pickerTokenClient = google.accounts.oauth2.initTokenClient({
      client_id: this.googleClientId,
      scope: this.pickerScopes.join(' '),
      callback: (response: any) => {
        if (response?.access_token) {
          this.oauthToken = response.access_token;
          this.googlePickerError = '';
          if (this.pendingPickerOpen) {
            this.pendingPickerOpen = false;
            this.createPicker();
          }
        } else if (response?.error) {
          this.googlePickerError = 'import.google.oauthDenied';
          this.pendingPickerOpen = false;
        }
      }
    });
    this.tryEnablePicker();
  }

  private tryEnablePicker(): void {
    if (this.pickerApiLoaded && this.pickerTokenClient) {
      this.googlePickerReady = true;
      if (this.googlePickerError === 'import.google.pickerNotReady' || this.googlePickerError === 'import.google.missingConfig') {
        this.googlePickerError = '';
      }
    }
  }

  openDrivePicker(): void {
    if (this.googlePickerError === 'import.google.missingConfig') {
      return;
    }
    if (!this.googlePickerReady || !this.pickerTokenClient) {
      this.googlePickerError = this.googlePickerError || 'import.google.pickerNotReady';
      return;
    }
    if (!this.oauthToken) {
      this.pendingPickerOpen = true;
      this.pickerTokenClient.requestAccessToken({ prompt: 'consent' });
      return;
    }
    this.createPicker();
  }

  private createPicker(): void {
    if (typeof google === 'undefined' || !google.picker || !this.oauthToken) {
      this.googlePickerError = 'import.google.pickerNotReady';
      return;
    }
    const view = new google.picker.DocsView(google.picker.ViewId.SPREADSHEETS)
      .setMimeTypes(this.googleMimeTypes)
      .setSelectFolderEnabled(false);
    const picker = new google.picker.PickerBuilder()
      .enableFeature(google.picker.Feature.NAV_HIDDEN)
      .enableFeature(google.picker.Feature.MULTISELECT_DISABLED)
      .setDeveloperKey(this.googleApiKey)
      .setOAuthToken(this.oauthToken)
      .addView(view)
      .setCallback((data: any) => this.handlePickerSelection(data))
      .build();
    picker.setVisible(true);
  }

  private handlePickerSelection(data: any): void {
    if (!data) {
      return;
    }
    const action = data[google.picker.Response.ACTION];
    if (action === google.picker.Action.CANCEL) {
      return;
    }
    if (action !== google.picker.Action.PICKED) {
      return;
    }
    const doc = data[google.picker.Response.DOCUMENTS]?.[0];
    if (!doc) {
      return;
    }
    const id = doc[google.picker.Document.ID];
    const name = doc[google.picker.Document.NAME];
    const url =
      doc[google.picker.Document.URL] ||
      `https://docs.google.com/spreadsheets/d/${id}`;
    this.selectedSpreadsheet = { id, name, url };
    this.googleSheetUrl = url;
    this.googlePickerError = '';
    this.googleError = '';
    this.availableSheets = [];
    this.googleSheetName = '';
    this.fetchSheetMetadata(id);
  }

  private fetchSheetMetadata(spreadsheetId: string): void {
    this.googleFileLoading = true;
    this.http.get<GoogleSheetMetadata[]>(`/api/import/google/spreadsheets/${spreadsheetId}/sheets`).subscribe({
      next: (sheets) => {
        this.googleFileLoading = false;
        this.availableSheets = sheets ?? [];
        if (this.availableSheets.length === 0) {
          this.googleError = 'import.google.emptySpreadsheet';
          return;
        }
        this.googleSheetName = this.availableSheets[0].title;
        this.googleError = '';
      },
      error: (err) => {
        this.googleFileLoading = false;
        const backendMessage = err?.error?.message || err?.error?.detail;
        const normalized = this.normalizeGoogleError(backendMessage);
        this.googleError = normalized;
        const detail = this.asErrorDetail(normalized);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('import.error'),
          detail
        });
      }
    });
  }

  onSheetSelected(sheetTitle: string): void {
    this.googleSheetName = sheetTitle;
    this.clearGoogleError();
  }

  get googleSheetOptions(): Array<{ label: string; value: string }> {
    return this.availableSheets.map(sheet => ({
      label: sheet.title,
      value: sheet.title
    }));
  }

  openGoogleConfigDialog(): void {
    if (!this.canManageGoogleIntegration) {
      return;
    }
    this.googleConfigForm = {
      clientId: this.googleClientId ?? '',
      apiKey: this.googleApiKey ?? ''
    };
    this.showGoogleConfigDialog = true;
  }

  closeGoogleConfigDialog(): void {
    this.showGoogleConfigDialog = false;
    this.googleConfigSaving = false;
  }

  saveGoogleIntegrationConfig(): void {
    if (!this.canManageGoogleIntegration) {
      return;
    }
    const clientId = this.googleConfigForm.clientId.trim();
    const apiKey = this.googleConfigForm.apiKey.trim();
    if (!clientId || !apiKey) {
      this.googlePickerError = 'import.google.missingConfig';
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('import.error'),
        detail: this.translate.instant('import.google.configValidation')
      });
      return;
    }
    this.googleConfigSaving = true;
    this.http.put<GoogleIntegrationConfig>('/api/admin/google-integration', { clientId, apiKey }).subscribe({
      next: (config) => {
        this.googleConfigSaving = false;
        this.showGoogleConfigDialog = false;
        this.googleClientId = config.clientId ?? clientId;
        this.googleApiKey = config.apiKey ?? apiKey;
        this.resetPickerState();
        if (this.googleClientId && this.googleApiKey) {
          this.initializeGooglePicker();
        }
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('import.success'),
          detail: this.translate.instant('import.google.configUpdated')
        });
      },
      error: (err) => {
        this.googleConfigSaving = false;
        const detail = err?.error?.message || this.translate.instant('import.google.configUpdateError');
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('import.error'),
          detail
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

  get googleDomainOptions() {
    return this.componentOptions.map(option => ({
      ...option,
      configured: this.isTableConfigured(option.value),
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
    return !!this.googleDomain && !!this.selectedSpreadsheet && !!this.googleSheetName && !this.googleLoading;
  }

  submitGoogleImport(activateCallback?: (step: number) => void): void {
    if (!this.googleDomain) {
      this.googleError = 'import.google.domainRequired';
      return;
    }
    if (!this.selectedSpreadsheet) {
      this.googleError = 'import.google.fileRequired';
      return;
    }
    if (!this.googleSheetName) {
      this.googleError = 'import.google.sheetRequired';
      return;
    }

    const requestBody = {
      domain: this.googleDomain,
      spreadsheetId: this.selectedSpreadsheet.id,
      sheetUrl: this.selectedSpreadsheet.url,
      tabName: this.googleSheetName
    };

    this.googleLoading = true;
    this.googleError = '';
    const targetDomain = this.googleDomain;

    this.http.post<GoogleSheetConnectResponse>('/api/import/google/connect', requestBody).subscribe({
      next: (response) => {
        this.googleLoading = false;
        if (!response?.configured) {
          this.googleError = 'import.google.connectError';
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
        this.resetGoogleSelection();
        this.googleDomain = '';
        this.googleStep = 0;
        activateCallback?.(0);
        this.activeTabIndex = 2;
      },
      error: (err) => {
        this.googleLoading = false;
        const backendMessage = err?.error?.message || err?.error?.detail;
        const normalized = this.normalizeGoogleError(backendMessage);
        this.googleError = normalized;
        const detail = this.asErrorDetail(normalized);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('import.error'),
          detail
        });
      }
    });
  }

  clearGoogleError(): void {
    this.googleError = '';
    if (this.googlePickerError !== 'import.google.missingConfig') {
      this.googlePickerError = '';
    }
  }

  private resetGoogleSelection(): void {
    this.selectedSpreadsheet = null;
    this.availableSheets = [];
    this.googleSheetUrl = '';
    this.googleSheetName = '';
    this.googleFileLoading = false;
    if (this.googlePickerError !== 'import.google.missingConfig') {
      this.googlePickerError = '';
    }
  }

  private resetPickerState(): void {
    this.googlePickerReady = false;
    this.googlePickerError = '';
    this.googleFileLoading = false;
    this.selectedSpreadsheet = null;
    this.availableSheets = [];
    this.googleSheetUrl = '';
    this.googleSheetName = '';
    this.googleLoading = false;
    this.oauthToken = null;
    this.pickerApiLoaded = false;
    this.gsiLoaded = false;
    this.pendingPickerOpen = false;
    this.googleScriptsRequested = false;
  }

  private normalizeGoogleError(message?: string): string {
    if (!message) {
      return 'import.google.connectError';
    }
    const lowered = message.toLowerCase();
    if (lowered.includes('service account credentials') || lowered.includes('service-account')) {
      return 'import.google.credentialsMissing';
    }
    return message;
  }

  private asErrorDetail(message: string): string {
    if (message.startsWith('import.')) {
      return this.translate.instant(message);
    }
    return message;
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
