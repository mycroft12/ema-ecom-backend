import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login.component';
import { HomeComponent } from './home/home.component';
import { HomeContentComponent } from './home/home-content.component';
import { ProductsPageComponent } from './features/products/products-page.component';
import { RolesPageComponent } from './features/roles/roles-page.component';
import { ImportTemplatePageComponent } from './features/import/import-template-page.component';
import { permissionGuard } from './core/permission.guard';
import { ForgotPasswordComponent } from './auth/forgot-password.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  {
    path: '',
    component: HomeComponent, // shell with sidenav + content outlet
    children: [
      { path: 'home', component: HomeContentComponent },
      { path: 'products', component: ProductsPageComponent, canActivate: [permissionGuard], data: { permissions: ['product:read'] } },
      { path: 'roles', component: RolesPageComponent, canActivate: [permissionGuard], data: { permissions: ['role:read'] } },
      { path: 'import', component: ImportTemplatePageComponent, canActivate: [permissionGuard], data: { permissions: ['import:configure'] } },
    ]
  }
];
