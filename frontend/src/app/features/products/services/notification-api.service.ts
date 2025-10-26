import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { NotificationEntryDto } from '../models/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationApiService {
  private readonly baseUrl = `${environment.apiBase}/api/notifications`;

  constructor(private http: HttpClient) {}

  fetchLatest(limit = 20): Observable<NotificationEntryDto[]> {
    return this.http.get<NotificationEntryDto[]>(this.baseUrl, { params: { limit } as any });
  }

  markAsRead(id: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${id}/read`, {});
  }

  markAllAsRead(): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/read-all`, {});
  }
}
