import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  template: `
    <div class="min-h-screen flex flex-column align-items-center justify-content-center text-center p-4">
      <div>
        <i class="pi pi-exclamation-triangle text-5xl text-600" aria-hidden="true"></i>
        <h1 class="mt-3">404</h1>
        <h2 class="mt-0">Page not found</h2>
        <p class="text-600 mb-4">The page you are looking for might have been removed, had its name changed or is temporarily unavailable.</p>
        <a routerLink="/dashboard" class="p-button p-component">
          <span class="p-button-icon pi pi-home mr-2" aria-hidden="true"></span>
          <span class="p-button-label">Go to Dashboard</span>
        </a>
      </div>
    </div>
  `
})
export class NotFoundComponent {}
