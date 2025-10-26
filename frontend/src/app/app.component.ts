import { Component, Signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from './core/auth.service';
import { MenubarModule } from 'primeng/menubar';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LanguageService, LangCode } from './core/language.service';
import { LanguageSwitcherComponent } from './shared/language-switcher.component';
import { AvatarModule } from 'primeng/avatar';
import { OverlayPanelModule, OverlayPanel } from 'primeng/overlaypanel';
import { BadgeModule } from 'primeng/badge';
import { ProductUpsertListenerService } from './features/products/services/product-upsert-listener.service';
import { ProductBadgeService, NotificationEntry } from './features/products/services/product-badge.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, NgIf, FormsModule, MenubarModule, ButtonModule, DropdownModule, TranslateModule, LanguageSwitcherComponent, AvatarModule, OverlayPanelModule, BadgeModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  selectedLang: LangCode;
  private readonly badgeSignal: Signal<number>;
  private readonly notificationsSignal: Signal<NotificationEntry[]>;

  constructor(public auth: AuthService,
              private router: Router,
              public lang: LanguageService,
              private translateService: TranslateService,
              upsertListener: ProductUpsertListenerService,
              private productBadge: ProductBadgeService) {
    this.selectedLang = this.lang.current();
    this.badgeSignal = this.productBadge.asSignal();
    this.notificationsSignal = this.productBadge.notifications();
    upsertListener.start();
  }
  get isLoginPage(): boolean { return this.router.url.startsWith('/login'); }
  logout(){ this.auth.logout(); }
  onLangChange(code: LangCode){ this.lang.use(code); this.selectedLang = code; }

  badgeCount(): number {
    return this.badgeSignal();
  }

  notifications(): NotificationEntry[] {
    return this.notificationsSignal();
  }

  toggleNotifications(event: Event, panel: OverlayPanel): void {
    panel.toggle(event);
  }

  markAllNotificationsAsRead(event: Event): void {
    event.stopPropagation();
    this.productBadge.markAllAsRead();
  }

  openNotification(entry: NotificationEntry, panel: OverlayPanel): void {
    if (!entry.read) {
      this.productBadge.markAsRead(entry.id);
    }
    panel.hide();
    this.router.navigate(['/products']);
  }

  trackNotification = (_: number, entry: NotificationEntry) => entry.id;

  isInsert(entry: NotificationEntry): boolean {
    return (entry.event.action || '').toUpperCase() === 'INSERT';
  }

  getNotificationTitle(entry: NotificationEntry): string {
    const domainKey = entry.event.domain ?? 'product';
    const action = (entry.event.action || 'UPDATE').toLowerCase();
    const key = action === 'insert' ? 'insertTitle' : 'updateTitle';
    return this.translateService.instant(`notifications.${domainKey}.${key}`);
  }

  getNotificationDescription(entry: NotificationEntry): string {
    const domainKey = entry.event.domain ?? 'product';
    if ((entry.event.action || '').toUpperCase() === 'INSERT') {
      return this.translateService.instant(`notifications.${domainKey}.insertDescription`);
    }
    const column = entry.event.changedColumns && entry.event.changedColumns[0];
    const row = entry.event.rowNumber ?? '—';
    if (column) {
      return this.translateService.instant(`notifications.${domainKey}.updateDescription`, { column, row });
    }
    return this.translateService.instant(`notifications.${domainKey}.updateDescriptionFallback`, { row });
  }
}
