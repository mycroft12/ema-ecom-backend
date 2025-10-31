import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProductSchemaService } from '../../services/product-schema.service';
import { SchemaConfigurationRequest } from '../../models/product-schema.model';
import { CardModule } from 'primeng/card';
import { FileUploadModule } from 'primeng/fileupload';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageModule } from 'primeng/message';
import { ProgressBarModule } from 'primeng/progressbar';
import { DividerModule } from 'primeng/divider';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { HttpEventType } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { TranslateService } from '@ngx-translate/core';
import { HYBRID_TRANSLATION_PREFIX } from '../../../hybrid/hybrid.tokens';

@Component({
  selector: 'app-schema-configuration',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    FileUploadModule,
    ButtonModule,
    InputTextModule,
    CheckboxModule,
    MessageModule,
    ProgressBarModule,
    DividerModule,
    ToastModule,
    TranslateModule
  ],
  providers: [MessageService],
  templateUrl: './schema-configuration.component.html',
  styleUrls: ['./schema-configuration.component.scss']
})
export class SchemaConfigurationComponent {
  private readonly productSchemaService = inject(ProductSchemaService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  private readonly translationPrefix = inject(HYBRID_TRANSLATION_PREFIX);

  navigateToImport(): void {
    const domain = this.productSchemaService.entityTypeName || 'product';
    this.router.navigate(['/import'], { queryParams: { domain } });
  }

  readonly translationNamespace = this.productSchemaService.translationNamespace || this.translationPrefix;
  readonly displayName = signal<string>(this.productSchemaService.displayName());
  readonly validateBeforeApply = signal<boolean>(true);
  readonly selectedFile = signal<File | null>(null);
  readonly isUploading = signal<boolean>(false);

  onFileSelect(event: any): void {
    const file = event.files?.[0];
    if (file) {
      this.selectedFile.set(file);
      this.messageService.add({
        severity: 'info',
        summary: this.translate.instant(`${this.translationPrefix}.fileSelected`),
        detail: `${file.name}`
      });
    }
  }

  onFileRemove(): void {
    this.selectedFile.set(null);
  }

  uploadTemplate(): void {
    const file = this.selectedFile();
    if (!file) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant(`${this.translationPrefix}.noFile`),
        detail: this.translate.instant(`${this.translationPrefix}.selectFilePrompt`)
      });
      return;
    }

    const request: SchemaConfigurationRequest = {
      file,
      displayName: this.displayName(),
      validateBeforeApply: this.validateBeforeApply()
    };

    this.isUploading.set(true);

    this.productSchemaService.uploadTemplate(request).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.Response) {
          this.isUploading.set(false);
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant(`${this.translationPrefix}.toastSuccess`),
            detail: this.translate.instant(`${this.translationPrefix}.configuredSuccess`)
          });
          this.selectedFile.set(null);
        }
      },
      error: (error) => {
        this.isUploading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant(`${this.translationPrefix}.toastError`),
          detail: error.error?.message || this.translate.instant(`${this.translationPrefix}.uploadFailed`)
        });
      }
    });
  }
}
