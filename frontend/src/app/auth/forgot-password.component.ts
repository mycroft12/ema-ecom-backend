import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { MessagesModule } from 'primeng/messages';
import { AuthService } from '../core/auth.service';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, CardModule, ButtonModule, InputTextModule, MessageModule, MessagesModule, RouterLink, TranslateModule],
  template: `
    <div class="min-h-screen flex align-items-center justify-content-center p-3 surface-ground">
      <p-card styleClass="w-full" [style]="{ maxWidth: '480px' }" [header]="'forgot.title' | translate">
        <form (ngSubmit)="onSubmit()" class="p-fluid" novalidate *ngIf="!success">
          <div class="field mb-3">
            <label for="identifier" class="block mb-2">{{ 'forgot.identifier' | translate }}</label>
            <input pInputText id="identifier" [(ngModel)]="identifier" name="identifier" required placeholder="jane.doe" [disabled]="loading" class="w-full" />
            <small class="p-error" *ngIf="submitted && !identifier">{{ 'forgot.identifier' | translate }} {{ 'is required' }}</small>
          </div>
          <p-message *ngIf="error" severity="error" [text]="error" styleClass="mb-3"></p-message>
          <button pButton type="submit" class="w-full" [label]="loading ? ('forgot.sending' | translate) : ('forgot.send' | translate)" [icon]="loading ? 'pi pi-spinner pi-spin' : 'pi pi-envelope'" [disabled]="loading"></button>
        </form>
        <div *ngIf="success">
          <p class="m-0 mb-3">{{ 'forgot.info' | translate }}</p>
          <a pButton routerLink="/login" [label]="('forgot.backToLogin' | translate)" icon="pi pi-sign-in"></a>
        </div>
      </p-card>
    </div>
  `
})
export class ForgotPasswordComponent {
  identifier = '';
  loading = false;
  submitted = false;
  error = '';
  success = false;

  constructor(private auth: AuthService, private router: Router, private translate: TranslateService) {}

  onSubmit(){
    this.submitted = true;
    this.error = '';
    if(!this.identifier) return;
    this.loading = true;
    this.auth.forgotPassword(this.identifier).subscribe({
      next: () => { this.loading = false; this.success = true; },
      error: (err) => {
        this.loading = false;
        const backendMsg = err?.error?.message as string | undefined;
        const backendCode = err?.error?.code as string | undefined;
        if (backendCode) {
          const translated = this.translate.instant(backendCode);
          this.error = translated !== backendCode ? translated : (backendMsg || this.translate.instant('auth.errors.unexpected'));
        } else if (backendMsg) this.error = backendMsg; else this.error = err?.status === 0 ? this.translate.instant('auth.errors.serverUnreachable') : this.translate.instant('auth.errors.unexpected');
      }
    });
  }
}
