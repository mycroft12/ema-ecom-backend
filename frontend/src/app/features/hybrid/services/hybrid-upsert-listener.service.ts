import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { HybridBadgeService, HybridUpsertEvent } from './hybrid-badge.service';
import { AuthService } from '../../../core/auth.service';
import { HybridSchemaService } from './hybrid-schema.service';

@Injectable({ providedIn: 'root' })
export class HybridUpsertListenerService implements OnDestroy {
  private eventSource?: EventSource;
  private retryHandle?: ReturnType<typeof setTimeout>;

  constructor(private badge: HybridBadgeService,
              private zone: NgZone,
              private auth: AuthService,
              private schemaService: HybridSchemaService) {}

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
      } catch (error) {
        console.error('[HybridUpsertListener] Failed to parse event data', error);
      }
      if (!parsed) {
        return;
      }
      this.zone.run(() => {
        this.badge.notifyUpsert(parsed as HybridUpsertEvent);
      });
    });
    this.eventSource.addEventListener('error', (err) => {
      console.error('[HybridUpsertListener] SSE error', err);
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
}
