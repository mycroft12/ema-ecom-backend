import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { HybridBadgeService, HybridUpsertEvent } from './hybrid-badge.service';
import { AuthService } from '../../../core/auth.service';
import { HybridSchemaService } from './hybrid-schema.service';
import { MessageService } from 'primeng/api';
import { TranslateService } from '@ngx-translate/core';

@Injectable({ providedIn: 'root' })
export class HybridUpsertListenerService implements OnDestroy {
  private eventSource?: EventSource;
  private retryHandle?: ReturnType<typeof setTimeout>;
  private lastConnectionErrorAt = 0;

  constructor(private badge: HybridBadgeService,
              private zone: NgZone,
              private auth: AuthService,
              private schemaService: HybridSchemaService,
              private messageService: MessageService,
              private translate: TranslateService) {}

  start(): void {
    if (this.eventSource) {
      return;
    }
    const token = this.auth.getToken();
    if (!token) {
      return;
    }
    const domain = (this.schemaService.schema()?.domain ?? 'product').toLowerCase();
    const url = `/api/hybrid/${encodeURIComponent(domain)}/upserts/stream?token=${encodeURIComponent(token)}`;
    this.eventSource = new EventSource(url);
    this.eventSource.addEventListener('upsert', (event) => {
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
    this.eventSource.addEventListener('error', () => {
      this.reportConnectionError();
      this.stop();
      this.scheduleRetry();
    });
  }

  private stop(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = undefined;
    }
    if (this.retryHandle) {
      clearTimeout(this.retryHandle);
      this.retryHandle = undefined;
    }
  }

  private scheduleRetry(): void {
    if (this.retryHandle) {
      return;
    }
    this.retryHandle = setTimeout(() => {
      this.retryHandle = undefined;
      this.start();
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
