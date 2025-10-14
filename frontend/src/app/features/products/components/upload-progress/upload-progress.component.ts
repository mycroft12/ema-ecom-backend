import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProgressBarModule } from 'primeng/progressbar';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-upload-progress',
  standalone: true,
  imports: [CommonModule, ProgressBarModule, TranslateModule],
  template: `
    <div class="upload-progress mt-3">
      <p-progressBar [value]="progress()" [showValue]="true" />
      <p class="text-center text-sm text-500 mt-2">{{ 'products.uploading' | translate }}</p>
    </div>
  `
})
export class UploadProgressComponent {
  readonly progress = input.required<number>();
}
