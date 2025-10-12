import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterOutlet } from '@angular/router';
import { PanelMenuModule } from 'primeng/panelmenu';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NavService } from '../core/navigation/nav.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule,  RouterOutlet, PanelMenuModule, TranslateModule],
  template: `
    <div class="grid">
      <!-- Sidenav -->
      <div class="col-12 md:col-3 lg:col-2 mb-3">
        <p-panelMenu [model]="menu"></p-panelMenu>
      </div>

      <!-- Content -->
      <div class="col-12 md:col-9 lg:col-10">
        <router-outlet></router-outlet>
      </div>
    </div>
  `
})
export class HomeComponent implements OnInit, OnDestroy {
  menu = this.nav.menuItems();
  private sub?: Subscription;
  constructor(private nav: NavService, private translate: TranslateService) {}

  ngOnInit(): void {
    // Rebuild the menu whenever translations or language change
    this.sub = new Subscription();
    this.sub.add(this.translate.onLangChange.subscribe(() => {
      this.menu = this.nav.menuItems();
    }));
    this.sub.add(this.translate.onTranslationChange.subscribe(() => {
      this.menu = this.nav.menuItems();
    }));
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
