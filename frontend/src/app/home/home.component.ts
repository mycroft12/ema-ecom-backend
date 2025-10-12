import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PanelMenuModule } from 'primeng/panelmenu';
import { TranslateModule } from '@ngx-translate/core';
import { NavService } from '../core/navigation/nav.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, PanelMenuModule, TranslateModule],
  template: `
    <div class="grid">
      <!-- Sidenav -->
      <div class="col-12 md:col-3 lg:col-2 mb-3">
        <p-panelMenu [model]="menu"></p-panelMenu>
      </div>

      <!-- Content -->
      <div class="col-12 md:col-9 lg:col-10">
        <h2 class="mt-0">{{ 'menu.home' | translate }}</h2>
        <p class="text-600 mb-4">{{ 'app.title' | translate }}</p>
        <div class="grid">
          <div class="col-12 lg:col-4">
            <div class="p-3 border-1 surface-border border-round surface-card">
              <div class="text-600 mb-2">{{ 'menu.products' | translate }}</div>
              <a routerLink="/products" class="p-button p-component">
                <span class="p-button-icon pi pi-box mr-2" aria-hidden="true"></span>
                <span class="p-button-label">{{ 'menu.products' | translate }}</span>
              </a>
            </div>
          </div>
          <div class="col-12 lg:col-4">
            <div class="p-3 border-1 surface-border border-round surface-card">
              <div class="text-600 mb-2">{{ 'menu.employees' | translate }}</div>
              <a routerLink="/employees" class="p-button p-component">
                <span class="p-button-icon pi pi-users mr-2" aria-hidden="true"></span>
                <span class="p-button-label">{{ 'menu.employees' | translate }}</span>
              </a>
            </div>
          </div>
          <div class="col-12 lg:col-4">
            <div class="p-3 border-1 surface-border border-round surface-card">
              <div class="text-600 mb-2">{{ 'menu.delivery' | translate }}</div>
              <a routerLink="/delivery" class="p-button p-component">
                <span class="p-button-icon pi pi-truck mr-2" aria-hidden="true"></span>
                <span class="p-button-label">{{ 'menu.delivery' | translate }}</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class HomeComponent {
  menu = this.nav.menuItems();
  constructor(private nav: NavService) {}
}
