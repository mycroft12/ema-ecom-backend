import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { HybridEntityRecord } from '../hybrid/models/hybrid-entity.model';

export interface OrderAgent {
  id: string;
  username: string;
  email?: string;
}

export interface OrderStatus {
  id: string;
  name: string;
  displayOrder: number;
}

@Injectable({ providedIn: 'root' })
export class OrderManagementService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = environment.apiBase;

  listAgents(): Observable<OrderAgent[]> {
    return this.http.get<OrderAgent[]>(`${this.apiBase}/api/orders/agents`);
  }

  assignAgent(orderId: string, agentId: string): Observable<HybridEntityRecord> {
    return this.http.post<HybridEntityRecord>(`${this.apiBase}/api/orders/${orderId}/assignment`, { agentId });
  }

  listStatuses(): Observable<OrderStatus[]> {
    return this.http.get<OrderStatus[]>(`${this.apiBase}/api/orders/statuses`);
  }

  createStatus(payload: { name: string; displayOrder: number }): Observable<OrderStatus> {
    return this.http.post<OrderStatus>(`${this.apiBase}/api/orders/statuses`, payload);
  }

  updateStatus(id: string, payload: { name: string; displayOrder: number }): Observable<OrderStatus> {
    return this.http.put<OrderStatus>(`${this.apiBase}/api/orders/statuses/${id}`, payload);
  }

  deleteStatus(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiBase}/api/orders/statuses/${id}`);
  }
}
