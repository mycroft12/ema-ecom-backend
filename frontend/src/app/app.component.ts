import { Component } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from './core/auth.service';
import { MenubarModule } from 'primeng/menubar';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LanguageService, LangCode } from './core/language.service';
import { LanguageSwitcherComponent } from './shared/language-switcher.component';
import { AvatarModule } from 'primeng/avatar';
import { OverlayPanelModule } from 'primeng/overlaypanel';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, NgIf, FormsModule, MenubarModule, ButtonModule, DropdownModule, TranslateModule, LanguageSwitcherComponent, AvatarModule, OverlayPanelModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  selectedLang: LangCode;
  constructor(public auth: AuthService, private router: Router, public lang: LanguageService, private translateService: TranslateService) {
    this.selectedLang = this.lang.current();
  }
  get isLoginPage(): boolean { return this.router.url.startsWith('/login'); }
  logout(){ this.auth.logout(); }
  onLangChange(code: LangCode){ this.lang.use(code); this.selectedLang = code; }
}
