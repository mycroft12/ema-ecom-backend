import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService, LangCode } from '../core/language.service';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <div class="relative">
      <label for="lang-select" class="sr-only">{{ 'app.language' | translate }}</label>
      <select
        id="lang-select"
        [ngModel]="current"
        (ngModelChange)="onChange($event)"
        class="lang-native-select"
        aria-label="Select language"
      >
        <option *ngFor="let opt of lang.languages" [value]="opt.code">
          {{ opt.flagEmoji + ' ' + opt.label }}
        </option>
      </select>
    </div>
  `,
  styles: [`
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
    .lang-native-select {
      font-size: 0.85rem;
      padding: 0.25rem 0.5rem;
      border-radius: 0.375rem;
      border: 1px solid #cbd5e1; /* slate-300 */
      background: #fff;
      width: 8rem;
    }
  `]
})
export class LanguageSwitcherComponent {
  current: LangCode;
  constructor(public lang: LanguageService){
    this.current = this.lang.current();
  }
  onChange(val: LangCode){
    this.lang.use(val);
    this.current = val;
  }
}
