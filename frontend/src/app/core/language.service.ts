import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export type LangCode = 'en' | 'fr' | 'ar';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly key = 'ema_lang';
  readonly languages: { code: LangCode; label: string; flagUrl: string; flagEmoji: string }[] = [
    { code: 'en', label: 'English', flagUrl: '/assets/flags/en.svg', flagEmoji: '🇬🇧' },
    { code: 'fr', label: 'Français', flagUrl: '/assets/flags/fr.svg', flagEmoji: '🇫🇷' },
    { code: 'ar', label: 'العربية', flagUrl: '/assets/flags/ar.svg', flagEmoji: '🇸🇦' }
  ];

  constructor(private translate: TranslateService) {
    translate.addLangs(this.languages.map(l => l.code));
    const saved = (localStorage.getItem(this.key) as LangCode) || this.detect();
    this.use(saved);
  }

  current(): LangCode {
    return (this.translate.currentLang as LangCode) || 'en';
  }

  use(lang: LangCode) {
    this.translate.use(lang);
    localStorage.setItem(this.key, lang);
    // Adjust document direction for Arabic
    if (lang === 'ar') {
      document.documentElement.setAttribute('dir', 'rtl');
      document.documentElement.setAttribute('lang', 'ar');
    } else {
      document.documentElement.setAttribute('dir', 'ltr');
      document.documentElement.setAttribute('lang', lang);
    }
  }

  private detect(): LangCode {
    const browser = (navigator.language || 'en').slice(0, 2).toLowerCase();
    return (['en', 'fr', 'ar'] as LangCode[]).includes(browser as LangCode) ? (browser as LangCode) : 'en';
  }
}
