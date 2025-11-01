import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnDestroy,
  Output,
  TemplateRef,
  ViewChild
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { Dialog, DialogModule } from 'primeng/dialog';
import { TranslateModule } from '@ngx-translate/core';

type DialogSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-shared-dialog',
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonModule, TranslateModule],
  templateUrl: './shared-dialog.component.html',
  styleUrls: ['./shared-dialog.component.scss']
})
export class SharedDialogComponent implements OnDestroy {

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

  @ViewChild(Dialog) private dialogComponent?: Dialog;
  @ViewChild('dialogHeaderRef') private dialogHeaderRef?: ElementRef<HTMLElement>;
  @ViewChild('dialogFooterRef') private dialogFooterRef?: ElementRef<HTMLElement>;
  @ViewChild('dialogScrollRef') private dialogScrollRef?: ElementRef<HTMLElement>;

  headerHeight = 80;
  footerHeight = 88;

  private headerObserver?: ResizeObserver;
  private footerObserver?: ResizeObserver;
  private focusListener?: (event: FocusEvent) => void;

  constructor(private readonly ngZone: NgZone) {}

  get dialogClass(): string {
    const classes = ['app-dialog'];
    classes.push(`app-dialog--${this.size}`);
    if (this.responsive) {
      classes.push('app-dialog--responsive');
    }
    return classes.join(' ');
  }

  get dialogStyle(): Record<string, string> {
    return {
      '--app-dialog-header-height': `${this.headerHeight}px`,
      '--app-dialog-footer-height': `${this.footerHeight}px`
    };
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

  onShow(): void {
    this.attachObservers();
    this.attachFocusHandler();
    this.updateSizing();
    this.scheduleSizing();
  }

  onHide(): void {
    this.detachObservers();
    this.detachFocusHandler();
    this.close.emit('mask');
  }

  ngOnDestroy(): void {
    this.detachObservers();
    this.detachFocusHandler();
  }

  private attachObservers(): void {
    if (typeof ResizeObserver === 'undefined') {
      this.updateSizing();
      return;
    }

    this.detachObservers();
    const headerEl = this.dialogHeaderRef?.nativeElement;
    const footerEl = this.dialogFooterRef?.nativeElement;

    const scheduleUpdate = () => this.scheduleSizing();

    if (headerEl) {
      this.headerObserver = new ResizeObserver(scheduleUpdate);
      this.headerObserver.observe(headerEl);
    }

    if (footerEl) {
      this.footerObserver = new ResizeObserver(scheduleUpdate);
      this.footerObserver.observe(footerEl);
    }
  }

  private detachObservers(): void {
    this.headerObserver?.disconnect();
    this.footerObserver?.disconnect();
    this.headerObserver = undefined;
    this.footerObserver = undefined;
  }

  private scheduleSizing(): void {
    this.ngZone.runOutsideAngular(() => {
      requestAnimationFrame(() => {
        this.ngZone.run(() => this.updateSizing());
      });
    });
  }

  private updateSizing(): void {
    const headerSize = this.dialogHeaderRef?.nativeElement?.offsetHeight ?? this.headerHeight;
    const footerSize = this.dialogFooterRef?.nativeElement?.offsetHeight ?? this.footerHeight;
    this.headerHeight = headerSize;
    this.footerHeight = footerSize;
    const container = this.dialogComponent?.container;
    if (container) {
      container.style.setProperty('--app-dialog-header-height', `${headerSize}px`);
      container.style.setProperty('--app-dialog-footer-height', `${footerSize}px`);
    }
  }

  private attachFocusHandler(): void {
    const scrollEl = this.dialogScrollRef?.nativeElement;
    if (!scrollEl) {
      return;
    }
    if (this.focusListener) {
      return;
    }
    this.focusListener = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target || !scrollEl.contains(target)) {
        return;
      }
      this.ngZone.runOutsideAngular(() => {
        requestAnimationFrame(() => target.scrollIntoView({ block: 'nearest', inline: 'nearest' }));
      });
    };
    scrollEl.addEventListener('focusin', this.focusListener, true);
  }

  private detachFocusHandler(): void {
    const scrollEl = this.dialogScrollRef?.nativeElement;
    if (this.focusListener && scrollEl) {
      scrollEl.removeEventListener('focusin', this.focusListener, true);
    }
    this.focusListener = undefined;
  }
}
