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
import { TemplateDownloadComponent } from '../template-download/template-download.component';
import { UploadProgressComponent } from '../upload-progress/upload-progress.component';
import { HttpEventType } from '@angular/common/http';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

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
    TemplateDownloadComponent,
    UploadProgressComponent,
    TranslateModule
  ],
  providers: [MessageService],
  templateUrl: './schema-configuration.component.html',
  styleUrls: ['./schema-configuration.component.scss']
})
export class SchemaConfigurationComponent {
  private readonly schemaService = inject(ProductSchemaService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);

  navigateToImport(): void {
    this.router.navigate(['/import']);
  }

  readonly displayName = signal<string>('Products');
  readonly validateBeforeApply = signal<boolean>(true);
  readonly selectedFile = signal<File | null>(null);
  readonly isUploading = signal<boolean>(false);

  onFileSelect(event: any): void {
    const file = event.files?.[0];
    if (file) {
      this.selectedFile.set(file);
      this.messageService.add({
        severity: 'info',
        summary: 'File Selected',
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
      this.messageService.add({ severity: 'warn', summary: 'No File', detail: 'Please select a file to upload' });
      return;
    }

    const request: SchemaConfigurationRequest = {
      file,
      displayName: this.displayName(),
      validateBeforeApply: this.validateBeforeApply()
    };

    this.isUploading.set(true);

    this.schemaService.uploadTemplate(request).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.Response) {
          this.isUploading.set(false);
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Product schema configured successfully' });
          this.selectedFile.set(null);
        }
      },
      error: (error) => {
        this.isUploading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Upload Failed', detail: error.error?.message || 'Failed to upload template' });
      }
    });
  }
}
