import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { HybridBadgeService, HybridUpsertEvent } from './hybrid-badge.service';
import { AuthService } from '../../../core/auth.service';
import { HybridSchemaService } from './hybrid-schema.service';
import { MessageService } from 'primeng/api';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class HybridUpsertListenerService implements OnDestroy {
  private eventSources: Record<string, EventSource> = {};
  private retryHandles: Record<string, ReturnType<typeof setTimeout> | undefined> = {};
  private lastConnectionErrorAt = 0;

  constructor(private badge: HybridBadgeService,
              private zone: NgZone,
              private auth: AuthService,
              private schemaService: HybridSchemaService,
              private messageService: MessageService,
              private translate: TranslateService) {}

  async start(): Promise<void> {
    const domains = ['product', 'orders', 'ads'];

    const ensured = await firstValueFrom(this.auth.ensureAuthenticated()).catch(() => false);
    if (!ensured) {
      if (this.auth.isAuthenticated() && this.auth.isRefreshStale()) {
        this.auth.forceLogoutToLogin('auth.errors.reconnect');
      }
      return;
    }
    if (this.auth.isAuthenticated() && this.auth.isRefreshStale()) {
      const refreshed = await this.auth.tryRefreshWithTimeout(3000);
      if (!refreshed) {
        this.auth.forceLogoutToLogin('auth.errors.reconnect');
        return;
      }
    }
    const token = this.auth.getToken();
    if (!token) {
      return;
    }
    domains.forEach(domain => this.connectDomainStream(domain, token));
  }

  private connectDomainStream(domain: string, token: string): void {
    if (this.eventSources[domain]) {
      return;
    }
    const url = `/api/hybrid/${encodeURIComponent(domain)}/upserts/stream?token=${encodeURIComponent(token)}`;
    const source = new EventSource(url);
    this.eventSources[domain] = source;

    source.addEventListener('upsert', (event) => {
      let parsed: HybridUpsertEvent | null = null;
      try {
        parsed = event?.data ? JSON.parse(event.data) : null;
      } catch (_error) {
        this.reportParseError();
      }
      if (!parsed) {
        return;
      }
      this.zone.run(() => {
        this.badge.notifyUpsert(parsed as HybridUpsertEvent);
      });
    });

    source.addEventListener('error', () => {
      this.reportConnectionError();
      this.disconnectDomain(domain);
      this.scheduleRetry(domain, token);
    });
  }

  private disconnectDomain(domain: string): void {
    const source = this.eventSources[domain];
    if (source) {
      source.close();
      delete this.eventSources[domain];
    }
    const handle = this.retryHandles[domain];
    if (handle) {
      clearTimeout(handle);
      delete this.retryHandles[domain];
    }
  }

  private stop(): void {
    Object.keys(this.eventSources).forEach(domain => this.disconnectDomain(domain));
  }

  private scheduleRetry(domain: string, token: string): void {
    if (this.retryHandles[domain]) {
      return;
    }
    this.retryHandles[domain] = setTimeout(() => {
      delete this.retryHandles[domain];
      this.connectDomainStream(domain, token);
    }, 5000);
  }

  ngOnDestroy(): void {
    this.stop();
  }

  private reportParseError(): void {
    this.zone.run(() => {
      this.messageService.add({
        key: 'global',
        severity: 'error',
        summary: this.translate.instant('common.realtimeErrorTitle'),
        detail: this.translate.instant('common.realtimeParseError', {
          component: this.schemaService.displayName()
        })
      });
    });
  }

  private reportConnectionError(): void {
    const now = Date.now();
    if (now - this.lastConnectionErrorAt < 10000) {
      return;
    }
    this.lastConnectionErrorAt = now;
    this.zone.run(() => {
      this.messageService.add({
        key: 'global',
        severity: 'error',
        summary: this.translate.instant('common.realtimeErrorTitle'),
        detail: this.translate.instant('common.realtimeConnectionError', {
          component: this.schemaService.displayName()
        })
      });
    });
  }
}
