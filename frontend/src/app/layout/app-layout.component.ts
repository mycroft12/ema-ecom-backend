import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterOutlet, ActivatedRoute, NavigationEnd } from '@angular/router';
import { MenubarModule } from 'primeng/menubar';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { PanelMenuModule } from 'primeng/panelmenu';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { DividerModule } from 'primeng/divider';
import { AvatarModule } from 'primeng/avatar';
import { SelectModule } from 'primeng/select';
import { MenuModule } from 'primeng/menu';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LanguageService, LangCode } from '../core/language.service';
import { NavService } from '../core/navigation/nav.service';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, MenubarModule, ButtonModule, DrawerModule, PanelMenuModule, BreadcrumbModule, DividerModule, AvatarModule, SelectModule, MenuModule, FormsModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen flex flex-column">
      <!-- Topbar -->
      <p-menubar>
        <ng-template pTemplate="start">
          <button type="button" pButton icon="pi pi-bars" class="p-button-text mr-2" (click)="toggleSidebar()" aria-label="Toggle Menu"></button>
          <a routerLink="/home" class="flex align-items-center gap-2 no-underline text-color">
            <i class="pi pi-shopping-bag text-2xl" aria-hidden="true"></i>
            <span class="font-bold">{{ 'app.title' | translate }}</span>
          </a>
        </ng-template>
        <ng-template pTemplate="end">
          <div class="flex align-items-center gap-2">
            <p-select [options]="lang.languages" optionLabel="label" optionValue="code" [(ngModel)]="selectedLang" (onChange)="onLangChange($event.value)" styleClass="w-12rem" [ariaLabel]="'app.language' | translate"></p-select>
            <button pButton type="button" icon="pi pi-bell" class="p-button-text" aria-label="Notifications"></button>
            <button pButton type="button" icon="pi pi-moon" class="p-button-text" (click)="toggleTheme()" [ariaLabel]="themeLabel()"></button>
            <button pButton type="button" class="p-button-text flex align-items-center gap-2" (click)="profileMenu.toggle($event)" aria-haspopup="true" [ariaLabel]="auth.username()">
              <p-avatar icon="pi pi-user" shape="circle" size="large" aria-label="User"></p-avatar>
              <span class="hidden sm:inline">{{ auth.username() }}</span>
              <i class="pi pi-angle-down" aria-hidden="true"></i>
            </button>
            <p-menu #profileMenu [popup]="true" [model]="profileItems"></p-menu>
          </div>
        </ng-template>
      </p-menubar>

      <!-- Sidebar -->
      <p-drawer [(visible)]="sidebarOpen" position="left" [modal]="true" [dismissible]="true" [showCloseIcon]="true" styleClass="w-18rem">
        <div class="p-3">
          <p-panelMenu [model]="menuModel()"></p-panelMenu>
        </div>
      </p-drawer>

      <!-- Breadcrumb -->
      <div class="px-3 pt-3">
        <p-breadcrumb [model]="breadcrumbs()"></p-breadcrumb>
      </div>

      <!-- Content -->
      <div class="p-3 flex-auto">
        <router-outlet></router-outlet>
      </div>

      <!-- Footer -->
      <div class="p-3 text-600 text-sm border-top-1 surface-border flex justify-content-between">
        <span>v0.0.1</span>
        <span>{{ selectedLang }}</span>
      </div>
    </div>
  `
})
export class AppLayoutComponent {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  sidebarOpen = false;
  selectedLang: LangCode;
  profileItems = [] as any[];
  constructor(public lang: LanguageService, public nav: NavService, public auth: AuthService, private translate: TranslateService){
    this.selectedLang = this.lang.current();
    this.buildProfileItems();
    // Rebuild menu items when language changes for dynamic translation
    this.translate.onLangChange.subscribe(() => this.buildProfileItems());
    // Close sidebar on navigation (mobile UX)
    this.router.events.subscribe(ev => { if (ev instanceof NavigationEnd) this.sidebarOpen = false; });
  }

  toggleSidebar(){ this.sidebarOpen = !this.sidebarOpen; }

  onLangChange(code: LangCode){ this.lang.use(code); this.selectedLang = code; }

  // Simple theme toggle stub persisted locally
  toggleTheme(){
    const key = 'ema_theme';
    const next = (localStorage.getItem(key) || 'light') === 'light' ? 'dark' : 'light';
    localStorage.setItem(key, next);
    document.documentElement.toggleAttribute('data-theme-dark', next === 'dark');
  }
  themeLabel(){ return (localStorage.getItem('ema_theme') || 'light') === 'light' ? 'Enable dark theme' : 'Disable dark theme'; }

  onProfileUpdate(){
    // Placeholder for profile update navigation/modal
    this.router.navigateByUrl('/home');
  }

  private buildProfileItems(){
    this.profileItems = [
      { label: this.translate.instant('profile.update'), icon: 'pi pi-user-edit', command: () => this.onProfileUpdate() },
      { separator: true },
      { label: this.translate.instant('profile.disconnect'), icon: 'pi pi-sign-out', command: () => this.auth.logout() }
    ];
  }

  menuModel = () => this.nav.menuItems();

  breadcrumbs = () => this.nav.breadcrumbsFromRoute(this.router.routerState.snapshot.root);
}
