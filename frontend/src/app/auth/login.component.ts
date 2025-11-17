import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MessagesModule } from 'primeng/messages';
import { MessageModule } from 'primeng/message';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LanguageSwitcherComponent } from '../shared/language-switcher.component';
import { NavService } from '../core/navigation/nav.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, InputTextModule, PasswordModule, ButtonModule, CardModule, MessagesModule, MessageModule, TranslateModule],
  template: `
    <div class="min-h-screen p-3 surface-ground">
      <div class="flex align-items-center justify-content-center">
        <p-card styleClass="w-full" [style]="{ maxWidth: '640px' }" [header]="'auth.loginTitle' | translate">
          <form (ngSubmit)="onSubmit()" class="p-fluid" novalidate>
            <div class="field mb-3">
              <label for="username" class="block mb-2">{{ 'auth.username' | translate }}</label>
              <input pInputText id="username" [(ngModel)]="username" name="username" autocomplete="username" required [placeholder]="'auth.placeholder.username' | translate" [disabled]="loading" class="w-full" />
              <small class="p-error" *ngIf="submitted && !username">{{ 'auth.username' | translate }} {{ 'is required' }}</small>
            </div>

            <div class="field mb-3">
              <label for="password" class="block mb-2">{{ 'auth.password' | translate }}</label>
              <p-password id="password" [(ngModel)]="password" name="password" [toggleMask]="true" [feedback]="false" styleClass="w-full" inputStyleClass="w-full" required autocomplete="current-password" [placeholder]="'auth.placeholder.password' | translate" [disabled]="loading"></p-password>
              <small class="p-error" *ngIf="submitted && !password">{{ 'auth.password' | translate }} {{ 'is required' }}</small>
            </div>

            <p-message *ngIf="error" severity="error" [text]="error" styleClass="mb-3"></p-message>

            <button pButton type="submit" class="w-full" [label]="loading ? ('auth.signingIn' | translate) : ('auth.signIn' | translate)" [icon]="loading ? 'pi pi-spinner pi-spin' : 'pi pi-sign-in'" [disabled]="loading"></button>
          </form>

          <ng-template pTemplate="footer">
            <div class="text-sm text-600">
              <span class="block">{{ 'auth.needAccount' | translate }}</span>
            </div>
          </ng-template>
        </p-card>
      </div>
    </div>
  `
})
export class LoginComponent implements OnInit {
  username = '';
  password = '';
  error = '';
  loading = false;
  submitted = false;
  constructor(private auth: AuthService, private router: Router, private translate: TranslateService, private nav: NavService) {}


   ngOnInit(){
    const logoutMessageKey = this.auth.consumeLogoutMessage();
    if (logoutMessageKey) {
      const translated = this.translate.instant(logoutMessageKey);
      this.error = translated && translated !== logoutMessageKey ? translated : logoutMessageKey;
    }
    if (this.auth.isAuthenticated()) {
      this.router.navigateByUrl(this.defaultPostLoginRoute());
    }
  }

  onSubmit(){
    this.submitted = true;
    this.error = '';
    if(!this.username || !this.password){
      return;
    }
    this.loading = true;
    this.auth.login(this.username, this.password).subscribe({
      next: (res) => {
        this.auth.saveLoginResponse(res);
        this.loading = false;
        this.router.navigateByUrl(this.defaultPostLoginRoute());
      },
      error: (err) => {
        this.loading = false;
        const status = err?.status;
        const backendMsg = err?.error?.message as string | undefined;
        const backendCode = err?.error?.code as string | undefined;
        if (backendCode) {
          const translated = this.translate.instant(backendCode);
          this.error = translated !== backendCode ? translated : (backendMsg || this.translate.instant('auth.errors.unexpected'));
        } else if (backendMsg) this.error = backendMsg;
        else if (status === 0) this.error = this.translate.instant('auth.errors.serverUnreachable');
        else if (status === 400 || status === 401 || status === 404) this.error = this.translate.instant('auth.errors.invalid');
        else this.error = this.translate.instant('auth.errors.unexpected');
      }
    });
  }

  private defaultPostLoginRoute(): string {
    if (this.auth.hasAny(['dashboard:view'])) {
      return '/dashboard';
    }
    const menuItems = this.nav.menuItems()();
    const fallback = menuItems.find((item) => {
      const link = item.routerLink as string | undefined;
      return link && link !== '/dashboard';
    })?.routerLink as string | undefined;
    return fallback || '/login';
  }
}
