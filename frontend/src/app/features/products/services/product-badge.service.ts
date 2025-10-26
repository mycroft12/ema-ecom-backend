import { Injectable, Signal, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ProductBadgeService {
  private readonly countSignal = signal(0);
  private readonly readOnlyCount = this.countSignal.asReadonly();
  private readonly lastEventSignal = signal<ProductUpsertEvent | null>(null);
  private readonly readOnlyEvent = this.lastEventSignal.asReadonly();

  asSignal(): Signal<number> {
    return this.readOnlyCount;
  }

  upsertEvents(): Signal<ProductUpsertEvent | null> {
    return this.readOnlyEvent;
  }

  current(): number {
    return this.countSignal();
  }

  notifyUpsert(event: ProductUpsertEvent): void {
    this.countSignal.update((value) => value + 1);
    this.lastEventSignal.set(event);
  }

  reset(): void {
    this.countSignal.set(0);
  }
}

export interface ProductUpsertEvent {
  domain: string;
  rowId: string;
  timestamp: string;
}
