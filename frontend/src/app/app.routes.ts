import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login.component';
import { HomeComponent } from './home/home.component';
import { HomeContentComponent } from './home/home-content.component';
import { RolesPageComponent } from './features/roles/roles-page.component';
import { ImportTemplatePageComponent } from './features/import/import-template-page.component';
import { HybridPageComponent } from './features/hybrid/hybrid-page.component';
import { permissionGuard } from './core/permission.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: HomeComponent, // shell with sidenav + content outlet
    children: [
      { path: 'home', component: HomeContentComponent },
      { path: 'products', component: HybridPageComponent, canActivate: [permissionGuard], data: { permissions: ['product:read','product:create','product:update','product:delete'], entityType: 'product', translationPrefix: 'products', displayName: 'Products' } },
      { path: 'orders', component: HybridPageComponent, canActivate: [permissionGuard], data: { permissions: ['orders:read','orders:create','orders:update','orders:delete'], entityType: 'orders', translationPrefix: 'orders', displayName: 'Orders' } },
      { path: 'expenses', component: HybridPageComponent, canActivate: [permissionGuard], data: { permissions: ['expenses:read','expenses:create','expenses:update','expenses:delete'], entityType: 'expenses', translationPrefix: 'expenses', displayName: 'Expenses & Commissions' } },
      { path: 'ads', component: HybridPageComponent, canActivate: [permissionGuard], data: { permissions: ['ads:read','ads:create','ads:update','ads:delete'], entityType: 'ads', translationPrefix: 'ads', displayName: 'Advertising Performance' } },
      { path: 'roles', component: RolesPageComponent, canActivate: [permissionGuard], data: { permissions: ['role:read'] } },
      { path: 'import', component: ImportTemplatePageComponent, canActivate: [permissionGuard], data: { permissions: ['import:configure'] } },
    ]
  }
];
