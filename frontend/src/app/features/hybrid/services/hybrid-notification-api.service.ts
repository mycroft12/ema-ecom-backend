import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { NotificationEntryDto } from '../models/notification.model';

@Injectable({ providedIn: 'root' })
export class HybridNotificationApiService {
  private readonly baseUrl = `${environment.apiBase}/api/notifications`;

  constructor(private http: HttpClient) {}

  fetch(page = 0, size = 5): Observable<NotificationEntryDto[]> {
    const params = new HttpParams()
      .set('page', String(page))
      .set('size', String(size));
    return this.http.get<NotificationEntryDto[]>(this.baseUrl, { params });
  }

  markAsRead(id: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${id}/read`, {});
  }

  markAllAsRead(): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/read-all`, {});
  }
}
