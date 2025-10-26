import { CommonModule, DatePipe } from '@angular/common';
import { Component, Signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { OverlayPanelModule, OverlayPanel } from 'primeng/overlaypanel';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ProductBadgeService, NotificationEntry } from '../features/products/services/product-badge.service';

@Component({
  selector: 'app-notification-menu',
  standalone: true,
  imports: [CommonModule, ButtonModule, OverlayPanelModule, TranslateModule, DatePipe],
  templateUrl: './notification-menu.component.html',
  styleUrls: ['./notification-menu.component.scss']
})
export class NotificationMenuComponent {
  private readonly badge = inject(ProductBadgeService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  readonly badgeCount = this.badge.asSignal();
  readonly notifications = this.badge.notifications();
  readonly loading = this.badge.loading();
  readonly hasMore = this.badge.hasMore();

  toggle(event: Event, panel: OverlayPanel): void {
    if (!this.notifications().length && !this.loading()) {
      this.badge.loadNextPage();
    }
    panel.toggle(event);
  }

  markAllAsRead(event: Event): void {
    event.stopPropagation();
    this.badge.markAllAsRead();
  }

  onScroll(event: Event): void {
    if (this.loading() || !this.hasMore()) {
      return;
    }
    const target = event.target as HTMLElement | null;
    if (!target) {
      return;
    }
    const threshold = 32;
    if (target.scrollTop + target.clientHeight >= target.scrollHeight - threshold) {
      this.badge.loadNextPage();
    }
  }

  open(entry: NotificationEntry, panel: OverlayPanel): void {
    if (!entry.read) {
      this.badge.markAsRead(entry.id);
    }
    panel.hide();
    this.router.navigate(['/products']);
  }

  trackById = (_: number, entry: NotificationEntry) => entry.id;

  isInsert(entry: NotificationEntry): boolean {
    return (entry.event.action || '').toUpperCase() === 'INSERT';
  }

  titleFor(entry: NotificationEntry): string {
    const domainKey = entry.event.domain ?? 'product';
    const action = (entry.event.action || 'UPDATE').toLowerCase();
    const key = action === 'insert' ? 'insertTitle' : 'updateTitle';
    return this.translate.instant(`notifications.${domainKey}.${key}`);
  }

  descriptionFor(entry: NotificationEntry): string {
    const domainKey = entry.event.domain ?? 'product';
    if ((entry.event.action || '').toUpperCase() === 'INSERT') {
      return this.translate.instant(`notifications.${domainKey}.insertDescription`);
    }
    const column = entry.event.changedColumns && entry.event.changedColumns[0];
    const row = entry.event.rowNumber ?? '—';
    if (column) {
      return this.translate.instant(`notifications.${domainKey}.updateDescription`, { column, row });
    }
    return this.translate.instant(`notifications.${domainKey}.updateDescriptionFallback`, { row });
  }
}
