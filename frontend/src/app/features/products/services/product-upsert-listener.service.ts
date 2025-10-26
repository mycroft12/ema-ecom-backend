import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { ProductBadgeService, ProductUpsertEvent } from './product-badge.service';
import { AuthService } from '../../../core/auth.service';

@Injectable({ providedIn: 'root' })
export class ProductUpsertListenerService implements OnDestroy {
  private eventSource?: EventSource;
  private retryHandle?: ReturnType<typeof setTimeout>;

  constructor(private badge: ProductBadgeService, private zone: NgZone, private auth: AuthService) {}

  start(): void {
    if (this.eventSource) {
      return;
    }
    const token = this.auth.getToken();
    if (!token) {
      console.log('[ProductUpsertListener] No token available; retrying in 5s');
      this.scheduleRetry();
      return;
    }
    const url = `/api/products/upserts/stream?token=${encodeURIComponent(token)}`;
    console.log('[ProductUpsertListener] Connecting to', url);
    this.eventSource = new EventSource(url);
    this.eventSource.addEventListener('upsert', (event) => {
      console.log('[ProductUpsertListener] upsert event received', event);
      let parsed: ProductUpsertEvent | null = null;
      try {
        parsed = event?.data ? JSON.parse(event.data) : null;
      } catch (error) {
        console.error('[ProductUpsertListener] Failed to parse event data', error);
      }
      if (!parsed) {
        return;
      }
      this.zone.run(() => {
        this.badge.notifyUpsert(parsed as ProductUpsertEvent);
      });
    });
    this.eventSource.addEventListener('error', (err) => {
      console.error('[ProductUpsertListener] SSE error', err);
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
