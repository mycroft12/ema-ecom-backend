import { Component, input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProgressBarModule } from 'primeng/progressbar';
import { TranslateModule } from '@ngx-translate/core';
import { HYBRID_TRANSLATION_PREFIX } from '../../hybrid.tokens';

@Component({
  selector: 'app-hybrid-upload-progress',
  standalone: true,
  imports: [CommonModule, ProgressBarModule, TranslateModule],
  template: `
    <div class="upload-progress mt-3">
      <p-progressBar [value]="progress()" [showValue]="true" />
      <p class="text-center text-sm text-500 mt-2">{{ (translationPrefix + '.uploading') | translate }}</p>
    </div>
  `
})
export class HybridUploadProgressComponent {
  protected readonly translationPrefix = inject(HYBRID_TRANSLATION_PREFIX);
  readonly progress = input.required<number>();
}
