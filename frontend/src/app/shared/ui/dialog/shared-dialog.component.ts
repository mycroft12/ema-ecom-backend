import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, TemplateRef } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TranslateModule } from '@ngx-translate/core';

type DialogSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-shared-dialog',
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonModule, TranslateModule],
  templateUrl: './shared-dialog.component.html',
  styleUrls: ['./shared-dialog.component.scss']
})
export class SharedDialogComponent {

  @Input({ required: true }) isOpen = false;
  @Output() close = new EventEmitter<'escape' | 'closeButton' | 'mask'>();

  @Input() title = '';
  @Input() subtitle?: string;
  @Input() size: DialogSize = 'md';
  @Input() responsive = true;
  @Input() footerActions?: TemplateRef<unknown>;
  @Input() ariaLabelledBy?: string;

  readonly breakpoints = {
    '1199px': '75vw',
    '991px': '85vw',
    '767px': '95vw'
  };

  get dialogClass(): string {
    const classes = ['app-dialog'];
    classes.push(`app-dialog--${this.size}`);
    if (this.responsive) {
      classes.push('app-dialog--responsive');
    }
    return classes.join(' ');
  }

  get headerId(): string {
    return this.ariaLabelledBy ?? 'app-dialog-title';
  }

  get hasSubtitle(): boolean {
    return !!this.subtitle && this.subtitle.trim().length > 0;
  }

  get hasFooter(): boolean {
    return !!this.footerActions;
  }

  onHide(): void {
    this.close.emit('mask');
  }
}
