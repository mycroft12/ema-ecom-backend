import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NavService } from '../core/navigation/nav.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-home-content',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  template: `
    <div>
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
  `
})
export class HomeContentComponent implements OnInit, OnDestroy {
  featureTiles = this.buildTiles();
  private sub?: Subscription;
  constructor(private nav: NavService, private translate: TranslateService) {}

  private buildTiles() {
    const items = this.nav.menuItems()();
    return items
      .filter((i) => (i as any).routerLink && (i as any).routerLink !== '/home')
      .map((i) => ({
        label: (i as any).label as string,
        icon: (i as any).icon as string,
        routerLink: (i as any).routerLink as string
      }));
  }

  ngOnInit(): void {
    this.sub = new Subscription();
    this.sub.add(this.translate.onLangChange.subscribe(() => {
      this.featureTiles = this.buildTiles();
    }));
    this.sub.add(this.translate.onTranslationChange.subscribe(() => {
      this.featureTiles = this.buildTiles();
    }));
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
