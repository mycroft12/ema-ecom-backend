import { Component } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { NgIf } from '@angular/common';
import { AuthService } from './core/auth.service';
import { MenubarModule } from 'primeng/menubar';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService, LangCode } from './core/language.service';
import { LanguageSwitcherComponent } from './shared/language-switcher.component';
import { AvatarModule } from 'primeng/avatar';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { HybridUpsertListenerService } from './features/hybrid/services/hybrid-upsert-listener.service';
import { NotificationMenuComponent } from './shared/notification-menu.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, NgIf, MenubarModule, ButtonModule, DropdownModule, TranslateModule, LanguageSwitcherComponent, AvatarModule, OverlayPanelModule, NotificationMenuComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  selectedLang: LangCode;

  constructor(public auth: AuthService,
              private router: Router,
              public lang: LanguageService,
              upsertListener: HybridUpsertListenerService) {
    this.selectedLang = this.lang.current();
    upsertListener.start();
  }
  get isLoginPage(): boolean { return this.router.url.startsWith('/login'); }
  logout(){ this.auth.logout(); }
  onLangChange(code: LangCode){ this.lang.use(code); this.selectedLang = code; }
}
