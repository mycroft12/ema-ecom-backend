import { Component, OnInit } from '@angular/core';
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
import { ToastModule } from 'primeng/toast';
import { HybridUpsertListenerService } from './features/hybrid/services/hybrid-upsert-listener.service';
import { NotificationMenuComponent } from './shared/notification-menu.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, NgIf, MenubarModule, ButtonModule, DropdownModule, TranslateModule, LanguageSwitcherComponent, AvatarModule, OverlayPanelModule, NotificationMenuComponent, ToastModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  selectedLang: LangCode;

  constructor(public auth: AuthService,
              private router: Router,
              public lang: LanguageService,
              private upsertListener: HybridUpsertListenerService) {
    this.selectedLang = this.lang.current();
  }

  async ngOnInit(): Promise<void> {
    await this.auth.initAutoSession();
    void this.upsertListener.start();
  }
  get isLoginPage(): boolean { return this.router.url.startsWith('/login'); }
  logout(){ this.auth.logout(); }
  onLangChange(code: LangCode){ this.lang.use(code); this.selectedLang = code; }
}
