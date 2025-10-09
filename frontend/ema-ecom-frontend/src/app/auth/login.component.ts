import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <h2>Login</h2>
    <form (ngSubmit)="onSubmit()">
      <div>
        <label>Username</label><br>
        <input [(ngModel)]="username" name="username" required>
      </div>
      <div>
        <label>Password</label><br>
        <input [(ngModel)]="password" name="password" type="password" required>
      </div>
      <div style="color:red" *ngIf="error">{{error}}</div>
      <button type="submit">Login</button>
    </form>
  `
})
export class LoginComponent {
  username = '';
  password = '';
  error = '';
  constructor(private auth: AuthService, private router: Router) {}
  onSubmit(){
    this.error = '';
    this.auth.login(this.username, this.password).subscribe({
      next: (res) => { this.auth.saveToken(res.accessToken); this.router.navigateByUrl('/'); },
      error: () => { this.error = 'Invalid credentials'; }
    });
  }
}
