import { Component, DestroyRef, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ActivatedRoute } from '@angular/router';
import { CardModule } from 'primeng/card';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { TabViewModule } from 'primeng/tabview';
import { StepperModule } from 'primeng/stepper';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { InputNumberModule } from 'primeng/inputnumber';
import { AuthService } from '../../core/auth.service';
import { OrderManagementService, OrderStatus } from '../orders/order-management.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

type DomainKey = 'product' | 'orders' | 'ads' | '';
type ConfigurationSource = 'dynamic' | 'google';

interface GoogleSheetConnectResponse {
  configured: boolean;
}

interface ConfiguredTableResponse {
  domain: string;
  tableName: string;
  rowCount: number;
  source?: ConfigurationSource;
}

interface ConfiguredDomainCard {
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

interface OtherCostEntry {
  id: string;
  name: string;
  amount: number;
}

interface CostsConfiguration {
  agentCommission: number | null;
  packageCost: number | null;
  fulfillmentCost: number | null;
  otherCosts: OtherCostEntry[];
}

interface DomainPopulationResponse {
  domain: string;
  table: string;
  inserted: number;
  replaceExistingRows: boolean;
  warnings: string[];
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
    ButtonModule,
    ConfirmDialogModule,
    ToastModule,
    TabViewModule,
    StepperModule,
    InputTextModule,
    MessageModule,
    DialogModule,
    TableModule,
    InputNumberModule
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

        .required-star {
          color: #dc2626;
          margin-left: 0.25rem;
        }

        .required-indicator {
          color: #dc2626;
          margin-left: 0.25rem;
        }
      }`
  ],
  template: `
    <p-tabView [(activeIndex)]="activeTabIndex">
      <p-tabPanel>
        <ng-template pTemplate="header">
          <i class="pi pi-cloud mr-2"></i>
          {{ 'import.tabs.google' | translate }}
        </ng-template>
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
              <button
                pButton
                type="button"
                class="p-button-text"
                [label]="'import.google.howToApis' | translate"
                (click)="showApiInstructionsDialog = true"
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
                        <span
                          *ngIf="selected.configured && selected.value !== 'orders'"
                          class="ml-2 text-xs bg-primary-100 text-primary-900 px-2 py-1 border-round"
                        >
                          {{ 'import.configured' | translate }}
                        </span>
                      </div>
                    </ng-template>
                    <ng-template pTemplate="item" let-option>
                      <div
                        class="flex align-items-center justify-content-between"
                        [class.text-400]="option.configured && option.value !== 'orders'"
                      >
                        <span>{{ option.key | translate }}</span>
                        <span
                          *ngIf="option.configured && option.value !== 'orders'"
                          class="ml-2 text-xs bg-primary-100 text-primary-900 px-2 py-1 border-round"
                        >
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
                      <label for="googleSheetName" class="block mb-2">
                        {{ 'import.google.sheetTabLabel' | translate }}
                        <span class="required-star">*</span>
                      </label>
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
      <p-tabPanel>
        <ng-template pTemplate="header">
          <i class="pi pi-list mr-2"></i>
          {{ 'import.tabs.configured' | translate }}
        </ng-template>
        <div *ngIf="configuredDomainCards.length === 0" class="py-4 text-600">
          {{ 'import.configuredEmpty' | translate }}
        </div>
        <div class="grid" *ngIf="configuredDomainCards.length > 0">
          <div *ngFor="let configuredDomain of configuredDomainCards" class="col-12 md:col-4 mb-3">
            <p-card>
              <ng-template pTemplate="header">
                <div class="flex align-items-center p-3">
                  <i class="pi pi-check-circle text-green-500 mr-2"></i>
                  <span class="font-bold">{{ getDomainDisplayName(configuredDomain.domain) | translate }}</span>
                </div>
              </ng-template>
              <div class="p-3">
                <p>
                  {{ 'import.domainConfiguredSource' | translate: {
                    domain: (getDomainDisplayName(configuredDomain.domain) | translate),
                    source: ((getConfigurationSourceKey(configuredDomain.domain)) | translate)
                  } }}
                </p>
                <p class="text-600 text-sm">
                  {{ 'import.rowCountLabel' | translate:{ count: configuredDomain.rowCount } }}
                </p>
                <div class="mt-3 pt-3 border-top-1 surface-border" *ngIf="isAdmin">
                  <div class="flex flex-column gap-3">
                    <div class="flex align-items-center justify-content-between">
                      <button
                        pButton
                        type="button"
                        [label]="('import.resetTable' | translate)"
                        icon="pi pi-trash"
                        severity="danger"
                        (click)="resetTable(configuredDomain.domain)"
                        size="small"
                      ></button>
                    </div>
                  </div>
                </div>
              </div>
            </p-card>
          </div>
        </div>
      </p-tabPanel>
      <p-tabPanel>
        <ng-template pTemplate="header">
          <i class="pi pi-cog mr-2"></i>
          {{ 'import.tabs.orderConfig' | translate }}
        </ng-template>
        <p-card>
          <div class="flex flex-column gap-3">
            <div class="flex align-items-center justify-content-between flex-wrap gap-3">
              <div>
                <div class="font-bold text-lg">{{ 'import.orderStatus.title' | translate }}</div>
                <div class="text-600">{{ 'import.orderStatus.description' | translate }}</div>
              </div>
              <button
                pButton
                type="button"
                icon="pi pi-plus"
                [label]="'import.orderStatus.add' | translate"
                (click)="openOrderStatusDialog()"
                [disabled]="!canManageOrderStatuses"
              ></button>
            </div>
            <p-table
              [value]="orderStatuses"
              [loading]="orderStatusLoading"
              responsiveLayout="scroll"
              [rows]="6"
              [paginator]="orderStatuses.length > 6"
            >
              <ng-template pTemplate="header">
                <tr>
                  <th>{{ 'import.orderStatus.columns.name' | translate }}</th>
                  <th style="width: 8rem;">{{ 'import.orderStatus.columns.order' | translate }}</th>
                  <th style="width: 8rem;" *ngIf="canManageOrderStatuses">{{ 'import.orderStatus.columns.actions' | translate }}</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-status>
                <tr>
                  <td>
                    <div class="font-medium">{{ status.labelFr }}</div>
                    <div class="text-600 text-sm">{{ status.labelEn }}</div>
                  </td>
                  <td>{{ status.displayOrder }}</td>
                  <td *ngIf="canManageOrderStatuses" class="actions-column">
                    <button
                      pButton
                      type="button"
                      icon="pi pi-pencil"
                      class="p-button-rounded p-button-text"
                      (click)="openOrderStatusDialog(status)"
                    ></button>
                    <button
                      pButton
                      type="button"
                      icon="pi pi-trash"
                      class="p-button-rounded p-button-text p-button-danger"
                      (click)="confirmDeleteOrderStatus(status)"
                    ></button>
                  </td>
                </tr>
              </ng-template>
              <ng-template pTemplate="emptymessage">
                <tr>
                  <td [attr.colspan]="canManageOrderStatuses ? 3 : 2">{{ 'import.orderStatus.empty' | translate }}</td>
                </tr>
              </ng-template>
            </p-table>
          </div>
        </p-card>
      </p-tabPanel>
      <p-tabPanel>
        <ng-template pTemplate="header">
          <i class="pi pi-wallet mr-2"></i>
          {{ 'import.tabs.costs' | translate }}
        </ng-template>
        <p-card>
          <div class="flex flex-column gap-4">
            <p class="text-600">{{ 'import.costs.description' | translate }}</p>
            <div class="grid formgrid">
              <div class="col-12 md:col-4">
                <label class="field-label block mb-2" for="costsAgentCommission">
                  {{ 'import.costs.agentCommission' | translate }}
                </label>
                <p-inputNumber
                  inputId="costsAgentCommission"
                  mode="decimal"
                  [suffix]="' %'"
                  [minFractionDigits]="0"
                  [maxFractionDigits]="2"
                  [min]="0"
                  [max]="100"
                  [(ngModel)]="costsForm.agentCommission"
                  name="costsAgentCommission"
                  class="w-full"
                ></p-inputNumber>
              </div>
              <div class="col-12 md:col-4">
                <label class="field-label block mb-2" for="costsPackage">
                  {{ 'import.costs.packageCost' | translate }}
                </label>
                <p-inputNumber
                  inputId="costsPackage"
                  mode="decimal"
                  [minFractionDigits]="2"
                  [maxFractionDigits]="2"
                  [min]="0"
                  [(ngModel)]="costsForm.packageCost"
                  name="costsPackageCost"
                  class="w-full"
                ></p-inputNumber>
              </div>
              <div class="col-12 md:col-4">
                <label class="field-label block mb-2" for="costsFulfillment">
                  {{ 'import.costs.fulfillmentCost' | translate }}
                </label>
                <p-inputNumber
                  inputId="costsFulfillment"
                  mode="decimal"
                  [minFractionDigits]="2"
                  [maxFractionDigits]="2"
                  [min]="0"
                  [(ngModel)]="costsForm.fulfillmentCost"
                  name="costsFulfillmentCost"
                  class="w-full"
                ></p-inputNumber>
              </div>
            </div>

            <div class="flex flex-column gap-3">
              <div>
                <div class="font-bold text-lg">{{ 'import.costs.otherTitle' | translate }}</div>
                <div class="text-600">{{ 'import.costs.otherDescription' | translate }}</div>
              </div>
              <div class="grid formgrid align-items-end">
                <div class="col-12 md:col-5">
                  <label class="field-label block mb-2" for="otherCostName">
                    {{ 'import.costs.otherNameLabel' | translate }}
                  </label>
                  <input
                    pInputText
                    id="otherCostName"
                    [(ngModel)]="otherCostDraft.name"
                    name="otherCostName"
                    class="w-full"
                    autocomplete="off"
                  />
                </div>
                <div class="col-12 md:col-4">
                  <label class="field-label block mb-2" for="otherCostAmount">
                    {{ 'import.costs.otherAmountLabel' | translate }}
                  </label>
                  <p-inputNumber
                    inputId="otherCostAmount"
                    mode="decimal"
                    [minFractionDigits]="2"
                    [maxFractionDigits]="2"
                    [min]="0"
                    [(ngModel)]="otherCostDraft.amount"
                    name="otherCostAmount"
                    class="w-full"
                  ></p-inputNumber>
                </div>
                <div class="col-12 md:col-3 flex align-items-end">
                  <button
                    pButton
                    type="button"
                    icon="pi pi-plus"
                    class="w-full md:w-auto"
                    [label]="'import.costs.addOther' | translate"
                    (click)="addOtherCost()"
                  ></button>
                </div>
              </div>

              <p-table
                *ngIf="costsForm.otherCosts.length > 0; else otherCostsEmpty"
                [value]="costsForm.otherCosts"
                responsiveLayout="scroll"
                [rows]="5"
                [paginator]="costsForm.otherCosts.length > 5"
              >
                <ng-template pTemplate="header">
                  <tr>
                    <th>{{ 'import.costs.otherNameLabel' | translate }}</th>
                    <th style="width: 10rem;">{{ 'import.costs.otherAmountLabel' | translate }}</th>
                    <th style="width: 6rem;"></th>
                  </tr>
                </ng-template>
                <ng-template pTemplate="body" let-cost>
                  <tr>
                    <td>{{ cost.name }}</td>
                    <td>{{ cost.amount | number:'1.2-2' }}</td>
                    <td class="text-right">
                      <button
                        pButton
                        type="button"
                        icon="pi pi-trash"
                        class="p-button-rounded p-button-text p-button-danger"
                        (click)="removeOtherCost(cost.id)"
                      ></button>
                    </td>
                  </tr>
                </ng-template>
                <ng-template pTemplate="caption">
                  <div class="flex justify-content-end font-semibold">
                    {{ 'import.costs.otherTotal' | translate:{ amount: (otherCostsTotal | number:'1.2-2') } }}
                  </div>
                </ng-template>
              </p-table>
              <ng-template #otherCostsEmpty>
                <p class="text-600">{{ 'import.costs.otherEmpty' | translate }}</p>
              </ng-template>
            </div>

            <div class="flex justify-content-end gap-2">
              <button
                pButton
                type="button"
                class="p-button-outlined"
                [label]="'import.costs.reload' | translate"
                (click)="loadCostsConfiguration()"
              ></button>
              <button
                pButton
                type="button"
                icon="pi pi-save"
                [label]="'import.costs.save' | translate"
                [loading]="costsSaveInProgress"
                (click)="saveCostsConfiguration()"
              ></button>
            </div>
          </div>
        </p-card>
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
    <p-dialog
      [(visible)]="showApiInstructionsDialog"
      [modal]="true"
      [closable]="true"
      [style]="{ width: '30rem' }"
      [breakpoints]="{'960px': '75vw', '640px': '95vw'}"
      [header]="'import.google.howToApisTitle' | translate"
    >
      <ol class="pl-3">
        <li [innerHTML]="'import.google.howToApisStep1' | translate"></li>
        <li [innerHTML]="'import.google.howToApisStep2' | translate"></li>
        <li [innerHTML]="'import.google.howToApisStep3' | translate"></li>
        <li [innerHTML]="'import.google.howToApisStep4' | translate"></li>
        <li [innerHTML]="'import.google.howToApisStep5' | translate"></li>
        <li [innerHTML]="'import.google.howToApisStep6' | translate"></li>
        <li [innerHTML]="'import.google.howToApisStep7' | translate"></li>
        <li [innerHTML]="'import.google.howToApisStep8' | translate"></li>
      </ol>
      <ng-template pTemplate="footer">
        <button pButton type="button" class="p-button-text" [label]="'common.close' | translate" (click)="showApiInstructionsDialog = false"></button>
      </ng-template>
    </p-dialog>
    <p-dialog
      [(visible)]="orderStatusDialogVisible"
      [modal]="true"
      [style]="{ width: '25rem' }"
      [breakpoints]="{'960px': '90vw', '640px': '95vw'}"
      [header]="(editingOrderStatusId ? 'import.orderStatus.dialogEditTitle' : 'import.orderStatus.dialogCreateTitle') | translate"
    >
      <div class="form-grid flex flex-column gap-3">
        <div class="form-field">
          <label class="field-label" for="orderStatusNameFr">
            {{ 'import.orderStatus.form.nameFrLabel' | translate }}
            <span class="required-indicator">*</span>
          </label>
          <input
            pInputText
            class="w-full"
            id="orderStatusNameFr"
            [(ngModel)]="orderStatusForm.labelFr"
            name="orderStatusNameFr"
            autocomplete="off"
          />
        </div>
        <div class="form-field">
          <label class="field-label" for="orderStatusNameEn">
            {{ 'import.orderStatus.form.nameEnLabel' | translate }}
            <span class="required-indicator">*</span>
          </label>
          <input
            pInputText
            class="w-full"
            id="orderStatusNameEn"
            [(ngModel)]="orderStatusForm.labelEn"
            name="orderStatusNameEn"
            autocomplete="off"
          />
        </div>
        <div class="form-field">
          <label class="field-label" for="orderStatusOrder">
            {{ 'import.orderStatus.form.orderLabel' | translate }}
          </label>
          <input
            pInputText
            class="w-full"
            id="orderStatusOrder"
            [(ngModel)]="orderStatusForm.displayOrder"
            name="orderStatusOrder"
            type="number"
          />
        </div>
      </div>
      <ng-template pTemplate="footer">
        <button pButton type="button" class="p-button-text" [label]="'common.cancel' | translate" (click)="orderStatusDialogVisible = false"></button>
        <button pButton type="button" [label]="'common.save' | translate" (click)="saveOrderStatus()" [loading]="orderStatusSaving"></button>
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
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly orderManagement = inject(OrderManagementService);

  @ViewChild('serviceAccountFile') serviceAccountFileInput?: ElementRef<HTMLInputElement>;

  googleDomain: DomainKey = '';
  configuredTables: DomainKey[] = [];
  configuredSources: Record<string, ConfigurationSource> = {};
  configuredDomainCards: ConfiguredDomainCard[] = [];
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
  googleTestValidated = false;
  canManageGoogleIntegration = false;
  showInstructionsDialog = false;
  showApiInstructionsDialog = false;
  orderStatuses: OrderStatus[] = [];
  orderStatusLoading = false;
  orderStatusDialogVisible = false;
  orderStatusForm: { labelFr: string; labelEn: string; displayOrder: number } = {
    labelFr: '',
    labelEn: '',
    displayOrder: 0
  };
  editingOrderStatusId: string | null = null;
  orderStatusSaving = false;
  canManageOrderStatuses = false;
  private readonly costsStorageKey = 'ema.costsConfiguration';
  costsForm: CostsConfiguration = this.defaultCostsConfiguration();
  otherCostDraft: { name: string; amount: number | null } = { name: '', amount: null };
  costsSaveInProgress = false;
  populateLoading: Partial<Record<DomainKey, boolean>> = { '': false, product: false, orders: false, ads: false };
  readonly maxCsvSizeBytes = 10 * 1024 * 1024;

  readonly componentOptions: Array<{ key: string; value: DomainKey }> = [
    { key: 'import.domainProduct', value: 'product' },
    { key: 'import.domainOrders', value: 'orders' },
    { key: 'import.domainAds', value: 'ads' }
  ];

  ngOnInit(): void {
    this.isAdmin = this.auth.hasAny(['import:configure']);
    this.canManageGoogleIntegration = this.auth.hasAny(['google-sheet:access']);
    this.canManageOrderStatuses = this.auth.hasAny(['orders:update']);
    this.fetchConfiguredTables();
    if (this.canManageGoogleIntegration) {
      this.fetchServiceAccountStatus();
    }
    this.loadOrderStatuses();
    this.loadCostsConfiguration();
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const requestedDomain = this.normalizeDomain(params.get('domain'));
        if (requestedDomain && requestedDomain !== this.googleDomain) {
          this.googleDomain = requestedDomain;
          this.activeTabIndex = 0;
        }
      });
  }

  fetchConfiguredTables(): void {
    this.http.get<ConfiguredTableResponse[]>('/api/import/configure/tables').subscribe({
      next: (tables) => {
    const cards = tables
      .map(table => {
        const domain = this.normalizeDomain(table.domain);
        if (!domain) {
          return null;
        }
        return {
          domain,
          tableName: table.tableName,
          rowCount: typeof table.rowCount === 'number' ? table.rowCount : 0,
          source: table.source === 'google' ? 'google' : 'dynamic'
        } as ConfiguredDomainCard;
      })
      .filter((card): card is ConfiguredDomainCard => !!card)
      .filter(card => card.domain === 'orders');
        this.configuredDomainCards = cards;
        this.configuredTables = cards.map(card => card.domain);
        const nextSources: Record<string, ConfigurationSource> = {};
        cards.forEach(card => {
          nextSources[card.domain] = card.source ?? 'dynamic';
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

  get googleDomainOptions() {
    return this.componentOptions.map(option => ({
      ...option,
      configured: option.value === 'orders' ? false : this.isTableConfigured(option.value),
      disabled:
        !this.googleServiceAccount?.configured ||
        (this.isTableConfigured(option.value) && option.value !== 'orders')
    }));
  }

  onGoogleStepChange(step: number | undefined): void {
    this.googleStep = typeof step === 'number' ? step : 0;
  }

  get otherCostsTotal(): number {
    return this.costsForm.otherCosts.reduce((sum, entry) => sum + (entry.amount ?? 0), 0);
  }

  addOtherCost(): void {
    const name = (this.otherCostDraft.name || '').trim();
    const amount = this.coerceNumber(this.otherCostDraft.amount);
    if (!name) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('import.costs.validationTitle'),
        detail: this.translate.instant('import.costs.otherNameRequired')
      });
      return;
    }
    if (amount === null) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('import.costs.validationTitle'),
        detail: this.translate.instant('import.costs.otherAmountRequired')
      });
      return;
    }
    const entry: OtherCostEntry = {
      id: this.generateCostId(),
      name,
      amount
    };
    this.costsForm = {
      ...this.costsForm,
      otherCosts: [...this.costsForm.otherCosts, entry]
    };
    this.otherCostDraft = { name: '', amount: null };
  }

  removeOtherCost(id: string): void {
    this.costsForm = {
      ...this.costsForm,
      otherCosts: this.costsForm.otherCosts.filter(entry => entry.id !== id)
    };
  }

  saveCostsConfiguration(): void {
    const storage = this.getBrowserStorage();
    if (!storage) {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('import.error'),
        detail: this.translate.instant('import.costs.storageError')
      });
      return;
    }
    this.costsSaveInProgress = true;
    const payload: CostsConfiguration = {
      agentCommission: this.coerceNumber(this.costsForm.agentCommission),
      packageCost: this.coerceNumber(this.costsForm.packageCost),
      fulfillmentCost: this.coerceNumber(this.costsForm.fulfillmentCost),
      otherCosts: this.costsForm.otherCosts.map(entry => ({
        ...entry,
        amount: Number(entry.amount)
      }))
    };
    try {
      this.costsForm = payload;
      storage.setItem(this.costsStorageKey, JSON.stringify(payload));
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('import.success'),
        detail: this.translate.instant('import.costs.saveSuccess')
      });
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('import.error'),
        detail: this.translate.instant('import.costs.storageError')
      });
    } finally {
      this.costsSaveInProgress = false;
    }
  }

  loadCostsConfiguration(): void {
    const storage = this.getBrowserStorage();
    if (!storage) {
      this.costsForm = this.defaultCostsConfiguration();
      return;
    }
    try {
      const raw = storage.getItem(this.costsStorageKey);
      if (!raw) {
        this.costsForm = this.defaultCostsConfiguration();
        return;
      }
      const parsed = JSON.parse(raw);
      const otherCosts: OtherCostEntry[] = Array.isArray(parsed?.otherCosts)
        ? parsed.otherCosts
            .map((entry: any) => {
              const name = typeof entry?.name === 'string' ? entry.name.trim() : '';
              const numericAmount = this.coerceNumber(entry?.amount);
              if (!name || numericAmount === null) {
                return null;
              }
              return {
                id: typeof entry?.id === 'string' && entry.id ? entry.id : this.generateCostId(),
                name,
                amount: numericAmount
              } as OtherCostEntry;
            })
            .filter((entry: OtherCostEntry | null): entry is OtherCostEntry => !!entry)
        : [];
      this.costsForm = {
        agentCommission: this.coerceNumber(parsed?.agentCommission),
        packageCost: this.coerceNumber(parsed?.packageCost),
        fulfillmentCost: this.coerceNumber(parsed?.fulfillmentCost),
        otherCosts
      };
    } catch {
      this.costsForm = this.defaultCostsConfiguration();
    }
  }

  private defaultCostsConfiguration(): CostsConfiguration {
    return {
      agentCommission: null,
      packageCost: null,
      fulfillmentCost: null,
      otherCosts: []
    };
  }

  private getBrowserStorage(): Storage | null {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return null;
      }
      return window.localStorage;
    } catch {
      return null;
    }
  }

  private coerceNumber(value: unknown): number | null {
    if (value === null || value === undefined) {
      return null;
    }
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  private generateCostId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'cost-' + Math.random().toString(36).substring(2, 9);
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
    return !!this.googleDomain
      && !!this.googleSheetUrl.trim()
      && !!this.googleSheetName.trim()
      && !!this.googleServiceAccount?.configured
      && this.googleTestValidated
      && !this.googleLoading;
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

    const targetDomain = this.googleDomain;
    const requiresOverrideConfirm = targetDomain === 'orders' && this.isTableConfigured('orders');
    if (requiresOverrideConfirm) {
      this.confirmationService.confirm({
        message: this.translate.instant('import.google.overrideConfirmMessage'),
        header: this.translate.instant('import.google.overrideConfirmTitle'),
        icon: 'pi pi-exclamation-triangle',
        accept: () => this.resetAndExecuteGoogleImport(requestBody, targetDomain, activateCallback)
      });
      return;
    }

    this.executeGoogleImport(requestBody, targetDomain, activateCallback);
  }

  private resetAndExecuteGoogleImport(requestBody: any, targetDomain: DomainKey | null, activateCallback?: (step: number) => void): void {
    if (!targetDomain) {
      return;
    }
    this.googleLoading = true;
    this.googleErrorMessage = '';
    this.http.delete(`/api/import/configure/table`, { params: { domain: targetDomain } }).subscribe({
      next: () => {
        this.executeGoogleImport(requestBody, targetDomain, activateCallback);
      },
      error: (err) => {
        this.googleLoading = false;
        const detail = err?.error?.message || this.translate.instant('import.resetError');
        this.googleErrorMessage = detail;
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('import.error'),
          detail
        });
      }
    });
  }

  private executeGoogleImport(requestBody: any, targetDomain: DomainKey | null, activateCallback?: (step: number) => void): void {
    this.googleLoading = true;
    this.googleErrorMessage = '';

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
        this.refreshSessionTokens();
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
        this.googleTestValidated = false;
        this.googleStep = 0;
        activateCallback?.(0);
        this.activeTabIndex = 1;
      },
      error: (err) => {
        this.googleLoading = false;
        const detail = this.resolveGoogleConnectErrorMessage(err, targetDomain);
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
    this.googleTestValidated = false;
    this.http.post<GoogleSheetTestResponseDto>('/api/integrations/google/sheets/test', {
      spreadsheetId,
      tabName: this.googleSheetName.trim() ? this.googleSheetName.trim() : null
    }).subscribe({
      next: (response) => {
        this.googleTestLoading = false;
        this.googleTestHeaders = response.headers ?? [];
        this.googleTestTypes = response.typeRow ?? [];
        this.googleTestRows = response.dataRowCount ?? 0;
        this.googleTestValidated = true;
      },
      error: (err) => {
        this.googleTestLoading = false;
        this.googleTestHeaders = [];
        this.googleTestTypes = [];
        this.googleTestRows = 0;
        this.googleErrorMessage = this.resolveGoogleConnectErrorMessage(err, this.googleDomain);
        this.googleTestValidated = false;
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
    this.googleTestValidated = false;
    this.googleTestRows = 0;
    this.googleTestHeaders = [];
    this.googleTestTypes = [];
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

  isPopulateLoading(domain: DomainKey): boolean {
    return !!this.populateLoading[domain];
  }

  triggerPopulateUpload(domain: DomainKey, input: HTMLInputElement | null | undefined): void {
    if (!this.isAdmin || !domain || !input) {
      return;
    }
    input.value = '';
    input.click();
  }

  onPopulateFileSelected(event: Event, domain: DomainKey, input: HTMLInputElement | null | undefined): void {
    if (!this.isAdmin || !domain) {
      return;
    }
    const target = event.target as HTMLInputElement;
    const file = target?.files?.[0];
    if (!file) {
      return;
    }
    const filename = (file.name || '').toLowerCase();
    if (!filename.endsWith('.csv')) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('import.populateCsv.title'),
        detail: this.translate.instant('import.populateCsv.invalidType')
      });
      if (input) {
        input.value = '';
      }
      return;
    }
    if (file.size > this.maxCsvSizeBytes) {
      const limitMb = Math.round(this.maxCsvSizeBytes / 1024 / 1024);
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('import.populateCsv.title'),
        detail: this.translate.instant('import.populateCsv.tooLarge', { limit: limitMb })
      });
      if (input) {
        input.value = '';
      }
      return;
    }

    const formData = new FormData();
    formData.append('file', file, file.name);
    const params: any = { domain, replaceExisting: 'true' };
    this.populateLoading = { ...this.populateLoading, [domain]: true };
    this.http.post<DomainPopulationResponse>('/api/import/configure/populate', formData, { params }).subscribe({
      next: (resp) => {
        this.populateLoading = { ...this.populateLoading, [domain]: false };
        const inserted = resp?.inserted ?? 0;
        const warnings = Array.isArray(resp?.warnings) ? resp.warnings : [];
        const detail = warnings.length
          ? this.translate.instant('import.populateCsv.successWithWarnings', { inserted, warnings: warnings.join(' ') })
          : this.translate.instant('import.populateCsv.success', { inserted });
        this.messageService.add({
          severity: warnings.length ? 'warn' : 'success',
          summary: this.translate.instant('import.success'),
          detail
        });
        this.fetchConfiguredTables();
      },
      error: (err) => {
        this.populateLoading = { ...this.populateLoading, [domain]: false };
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('import.error'),
          detail: err?.error?.message || this.translate.instant('import.populateCsv.error')
        });
      }
    });

    if (input) {
      input.value = '';
    }
  }


  getDomainDisplayName(domain: DomainKey): string {
    const option = this.componentOptions.find(opt => opt.value === domain);
    return option ? option.key : domain;
  }

  getConfigurationSourceKey(domain: DomainKey): string {
    return `import.configuredSource.${this.configuredSources[domain] ?? 'dynamic'}`;
  }

  private refreshSessionTokens(): void {
    const refresh$ = this.auth.refreshAccessToken();
    refresh$.subscribe({
      next: (response) => {
        this.auth.saveLoginResponse(response);
      },
      error: () => {
        // Ignore refresh failures silently; UI will rely on existing permissions if refresh fails
      }
    });
  }

  private normalizeDomain(domain: string | DomainKey | null | undefined): DomainKey | null {
    const value = (domain ?? '').toString().trim().toLowerCase();
    switch (value) {
      case 'product':
      case 'products':
        return 'product';
      case 'order':
      case 'orders':
      case 'order_config':
      case 'orders_config':
        return 'orders';
      case 'ad':
      case 'ads':
      case 'advertising':
      case 'marketing':
      case 'ads_config':
        return 'ads';
      default:
        return null;
    }
  }

  private resolveGoogleConnectErrorMessage(err: any, domain: DomainKey | null): string {
    const raw = (err?.error?.message ?? err?.error?.detail ?? '').toString();
    const normalized = raw.toLowerCase();
    const domainLabelKey = domain ? this.getDomainDisplayName(domain) : '';
    const domainLabel = domainLabelKey ? this.translate.instant(domainLabelKey) : '';
    const domainDisplay = domainLabel || domain || this.translate.instant('import.domainPlaceholder');
    const normalizedDomain = (domain ?? '').toLowerCase();

    const sheetNotFoundIndicators = [
      'sheet tab',
      'not found',
      'unable to parse range'
    ];
    if (sheetNotFoundIndicators.every(indicator => normalized.includes(indicator))
        || (normalized.includes('sheet tab') && normalized.includes('not found'))) {
      return this.translate.instant('import.google.sheetNotFound');
    }

    if (normalized.includes('not connected to google sheets')) {
      const match = /domain ['\"]?([a-z0-9_-]+)['\"]?/i.exec(normalized);
      const reportedDomain = match?.[1] ?? '';
      if (reportedDomain && normalizedDomain && reportedDomain !== normalizedDomain) {
        return this.translate.instant('import.google.duplicateSheetError');
      }
      return this.translate.instant('import.google.domainNotConnected', { domain: domainDisplay });
    }

    const duplicateIndicators = [
      'already connected',
      'already linked',
      'already assigned',
      'already configured',
      'already used',
      'duplicate sheet',
      'same google sheet',
      'duplicate key value',
      'unique constraint',
      'uk_google_import_sheet',
      'already exists'
    ];
    if (duplicateIndicators.some(indicator => normalized.includes(indicator))) {
      if (domain === 'orders') {
        if (normalized.includes('orders')) {
          return this.translate.instant('import.google.sheetAlreadyLinkedOrders');
        }
        return this.translate.instant('import.google.duplicateSheetError');
      }
      return this.translate.instant('import.google.duplicateSheetError');
    }

    return raw || this.translate.instant('import.google.connectError');
  }

  loadOrderStatuses(): void {
    this.orderStatusLoading = true;
    this.orderManagement.listStatuses().subscribe({
      next: statuses => {
        this.orderStatuses = statuses ?? [];
        this.orderStatusLoading = false;
      },
      error: () => {
        this.orderStatusLoading = false;
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('import.error'),
          detail: this.translate.instant('import.orderStatus.loadError')
        });
      }
    });
  }

  openOrderStatusDialog(status?: OrderStatus): void {
    if (!this.canManageOrderStatuses) {
      return;
    }
    this.editingOrderStatusId = status?.id ?? null;
    this.orderStatusForm = {
      labelFr: status?.labelFr ?? '',
      labelEn: status?.labelEn ?? '',
      displayOrder: status?.displayOrder ?? this.orderStatuses.length + 1
    };
    this.orderStatusDialogVisible = true;
  }

  saveOrderStatus(): void {
    if (!this.canManageOrderStatuses) {
      return;
    }
    const trimmedFr = (this.orderStatusForm.labelFr ?? '').trim();
    const trimmedEn = (this.orderStatusForm.labelEn ?? '').trim();
    if (!trimmedFr || !trimmedEn) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('import.error'),
        detail: this.translate.instant('import.orderStatus.nameRequired')
      });
      return;
    }
    const payload = {
      labelFr: trimmedFr,
      labelEn: trimmedEn,
      displayOrder: Number(this.orderStatusForm.displayOrder ?? 0)
    };
    this.orderStatusSaving = true;
    const request$ = this.editingOrderStatusId
      ? this.orderManagement.updateStatus(this.editingOrderStatusId, payload)
      : this.orderManagement.createStatus(payload);
    request$.subscribe({
      next: () => {
        this.orderStatusSaving = false;
        this.orderStatusDialogVisible = false;
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('import.success'),
          detail: this.translate.instant('import.orderStatus.saveSuccess')
        });
        this.loadOrderStatuses();
      },
      error: (err) => {
        this.orderStatusSaving = false;
        this.handleOrderStatusError(err, 'import.orderStatus.saveError');
      }
    });
  }

  confirmDeleteOrderStatus(status: OrderStatus): void {
    if (!this.canManageOrderStatuses) {
      return;
    }
    this.confirmationService.confirm({
      header: this.translate.instant('import.orderStatus.deleteTitle'),
      message: this.translate.instant('import.orderStatus.deleteMessage', { name: status.labelFr }),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.translate.instant('common.yes'),
      rejectLabel: this.translate.instant('common.no'),
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.deleteOrderStatus(status)
    });
  }

  private deleteOrderStatus(status: OrderStatus): void {
    this.orderManagement.deleteStatus(status.id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('import.success'),
          detail: this.translate.instant('import.orderStatus.deleteSuccess')
        });
        this.loadOrderStatuses();
      },
      error: (err) => this.handleOrderStatusError(err, 'import.orderStatus.deleteError')
    });
  }

  private handleOrderStatusError(err: any, fallbackKey: string): void {
    const code = (err?.error?.message ?? '').toString();
    let messageKey = fallbackKey;
    if (code === 'order-status.inUse') {
      messageKey = 'import.orderStatus.deleteInUse';
    } else if (code === 'order-status.alreadyExists') {
      messageKey = 'import.orderStatus.duplicate';
    }
    this.messageService.add({
      severity: 'error',
      summary: this.translate.instant('import.error'),
      detail: this.translate.instant(messageKey)
    });
  }
}
