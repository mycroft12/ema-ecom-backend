import { Injectable, Signal, computed, signal } from '@angular/core';
import { NotificationApiService } from './notification-api.service';
import { NotificationEntryDto } from '../models/notification.model';

@Injectable({ providedIn: 'root' })
export class ProductBadgeService {
  private static readonly MAX_NOTIFICATIONS = 20;

  private readonly notificationsSignal = signal<NotificationEntry[]>([]);
  private readonly readOnlyNotifications = this.notificationsSignal.asReadonly();
  private readonly unreadCountSignal = computed(() => this.notificationsSignal().filter(entry => !entry.read).length);
  private readonly lastEventSignal = signal<ProductUpsertEvent | null>(null);
  private readonly readOnlyEvent = this.lastEventSignal.asReadonly();

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

  constructor(private api: NotificationApiService) {
    this.refreshFromServer();
  }

  notifyUpsert(event: ProductUpsertEvent): void {
    const entry: NotificationEntry = {
      id: event.notificationId ?? `${event.rowId}-${event.timestamp}`,
      event,
      read: false
    };
    this.notificationsSignal.update((items) => [entry, ...items.filter((existing) => existing.id !== entry.id)].slice(0, ProductBadgeService.MAX_NOTIFICATIONS));
    this.lastEventSignal.set(event);
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
    this.api.markAllAsRead().subscribe({ error: () => this.refreshFromServer() });
  }

  private refreshFromServer(): void {
    this.api.fetchLatest().subscribe({
      next: (entries) => this.notificationsSignal.set(entries.map((dto) => this.fromDto(dto))),
      error: () => {}
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
