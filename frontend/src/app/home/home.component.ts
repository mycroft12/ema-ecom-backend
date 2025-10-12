import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PanelMenuModule } from 'primeng/panelmenu';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NavService } from '../core/navigation/nav.service';
import { Subscription } from 'rxjs';

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
          <div class="col-12 sm:col-6 lg:col-4 xl:col-3" *ngFor="let f of featureTiles">
            <div class="p-3 border-1 surface-border border-round surface-card h-full">
              <div class="text-600 mb-2">{{ f.label }}</div>
              <a [routerLink]="f.routerLink" class="p-button p-component">
                <span class="p-button-icon" [ngClass]="f.icon + ' mr-2'" aria-hidden="true"></span>
                <span class="p-button-label">{{ f.label }}</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class HomeComponent implements OnInit, OnDestroy {
  menu = this.nav.menuItems();
  featureTiles = this.buildTiles();
  private sub?: Subscription;
  constructor(private nav: NavService, private translate: TranslateService) {}

  private buildTiles() {
    // Use translated MenuItem model from NavService and exclude Home itself
    const items = this.nav.menuItems();
    // MenuItem type is loose; pick fields we need safely
    return items
      .filter((i) => (i as any).routerLink && (i as any).routerLink !== '/home')
      .map((i) => ({
        label: (i as any).label as string,
        icon: (i as any).icon as string,
        routerLink: (i as any).routerLink as string
      }));
  }

  ngOnInit(): void {
    // Rebuild the menu and tiles whenever translations or language change to avoid showing raw keys like 'menu.home'.
    this.sub = new Subscription();
    this.sub.add(this.translate.onLangChange.subscribe(() => {
      this.menu = this.nav.menuItems();
      this.featureTiles = this.buildTiles();
    }));
    this.sub.add(this.translate.onTranslationChange.subscribe(() => {
      this.menu = this.nav.menuItems();
      this.featureTiles = this.buildTiles();
    }));
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
