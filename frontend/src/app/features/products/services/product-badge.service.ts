import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import { NotificationApiService } from './notification-api.service';
import { NotificationEntryDto } from '../models/notification.model';
import { AuthService } from '../../../core/auth.service';

@Injectable({ providedIn: 'root' })
export class ProductBadgeService {
  private static readonly PAGE_SIZE = 5;
  private static readonly MAX_CACHE = 100;

  private readonly notificationsSignal = signal<NotificationEntry[]>([]);
  private readonly readOnlyNotifications = this.notificationsSignal.asReadonly();
  private readonly unreadCountSignal = computed(() => this.notificationsSignal().filter(entry => !entry.read).length);
  private readonly lastEventSignal = signal<ProductUpsertEvent | null>(null);
  private readonly readOnlyEvent = this.lastEventSignal.asReadonly();
  private readonly loadingSignal = signal<boolean>(false);
  private readonly hasMoreSignal = signal<boolean>(true);

  private currentPage = 0;

  asSignal(): Signal<number> {
    return this.unreadCountSignal;
  }

  upsertEvents(): Signal<ProductUpsertEvent | null> {
    return this.readOnlyEvent;
  }

  notifications(): Signal<NotificationEntry[]> {
    return this.readOnlyNotifications;
  }

  current(): number {
    return this.unreadCountSignal();
  }

  private readonly auth = inject(AuthService);

  constructor(private api: NotificationApiService) {
    if (this.auth.isAuthenticated()) {
      this.refreshFromServer();
    }
  }

  notifyUpsert(event: ProductUpsertEvent): void {
    const entry: NotificationEntry = {
      id: event.notificationId ?? `${event.rowId}-${event.timestamp}`,
      event,
      read: false
    };
    const limit = Math.max(ProductBadgeService.PAGE_SIZE, (this.currentPage + 1) * ProductBadgeService.PAGE_SIZE);
    this.notificationsSignal.update(items => {
      const merged = [entry, ...items.filter(existing => existing.id !== entry.id)];
      const bounded = merged.slice(0, Math.min(limit, ProductBadgeService.MAX_CACHE));
      return bounded;
    });
    this.lastEventSignal.set(event);
    this.hasMoreSignal.set(true);
  }

  markAsRead(id: string): void {
    this.notificationsSignal.update((items) => items.map((entry) => {
      if (entry.id !== id) {
        return entry;
      }
      if (entry.read) {
        return entry;
      }
      return { ...entry, read: true };
    }));
    this.api.markAsRead(id).subscribe({ error: () => this.refreshFromServer() });
  }

  markAllAsRead(): void {
    this.notificationsSignal.update((items) => items.map((entry) => entry.read ? entry : { ...entry, read: true }));
    if (this.auth.isAuthenticated()) {
      this.api.markAllAsRead().subscribe({ error: () => this.refreshFromServer() });
    }
  }

  private refreshFromServer(): void {
    if (!this.auth.isAuthenticated()) {
      return;
    }
    this.loadPage(0, false);
  }

  loadNextPage(): void {
    if (!this.hasMoreSignal() || this.loadingSignal()) {
      return;
    }
    this.loadPage(this.currentPage + 1, true);
  }

  loading(): Signal<boolean> {
    return this.loadingSignal.asReadonly();
  }

  hasMore(): Signal<boolean> {
    return this.hasMoreSignal.asReadonly();
  }

  private loadPage(page: number, append: boolean): void {
    this.loadingSignal.set(true);
    const targetPage = Math.max(page, 0);
    this.api.fetch(targetPage, ProductBadgeService.PAGE_SIZE).subscribe({
      next: (entries) => {
        const mapped = entries.map(dto => this.fromDto(dto));
        this.applyEntries(mapped, append, targetPage);
        this.hasMoreSignal.set(entries.length === ProductBadgeService.PAGE_SIZE);
        this.currentPage = append ? targetPage : 0;
      },
      error: () => {
        this.loadingSignal.set(false);
      },
      complete: () => {
        this.loadingSignal.set(false);
      }
    });
  }

  private applyEntries(entries: NotificationEntry[], append: boolean, targetPage: number): void {
    const limit = Math.min((targetPage + 1) * ProductBadgeService.PAGE_SIZE, ProductBadgeService.MAX_CACHE);
    this.notificationsSignal.update(current => {
      const combined = append ? [...current, ...entries] : entries;
      const dedup = new Map<string, NotificationEntry>();
      const upsert = (entry: NotificationEntry) => {
        const existing = dedup.get(entry.id);
        if (!existing) {
          dedup.set(entry.id, entry);
          return;
        }
        const existingTime = new Date(existing.event.timestamp).getTime();
        const incomingTime = new Date(entry.event.timestamp).getTime();
        if (incomingTime > existingTime) {
          dedup.set(entry.id, entry);
        }
      };
      for (const entry of combined) {
        upsert(entry);
      }
      const sorted = Array.from(dedup.values()).sort((a, b) => {
        const aTime = new Date(a.event.timestamp).getTime();
        const bTime = new Date(b.event.timestamp).getTime();
        return bTime - aTime;
      });
      return sorted.slice(0, Math.max(limit, ProductBadgeService.PAGE_SIZE));
    });
  }

  private fromDto(dto: NotificationEntryDto): NotificationEntry {
    return {
      id: dto.id,
      read: dto.read,
      event: {
        domain: dto.domain,
        action: dto.action,
        rowId: dto.rowId,
        rowNumber: dto.rowNumber,
        changedColumns: dto.changedColumns,
        timestamp: dto.createdAt,
        notificationId: dto.id
      }
    };
  }
}

export interface NotificationEntry {
  id: string;
  event: ProductUpsertEvent;
  read: boolean;
}

export interface ProductUpsertEvent {
  domain: string;
  rowId: string;
  timestamp: string;
  action: string;
  rowNumber?: number;
  changedColumns?: string[];
  notificationId?: string;
}
