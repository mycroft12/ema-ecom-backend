import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login.component';
import { HomeComponent } from './home/home.component';
import { ProductsPageComponent } from './features/products/products-page.component';
import { EmployeesPageComponent } from './features/employees/employees-page.component';
import { RolesPageComponent } from './features/roles/roles-page.component';
import { RulesPageComponent } from './features/rules/rules-page.component';
import { ImportTemplatePageComponent } from './features/import/import-template-page.component';
import { DeliveryPageComponent } from './features/delivery/delivery-page.component';
import { permissionGuard } from './core/permission.guard';
import { ForgotPasswordComponent } from './auth/forgot-password.component';

export const routes: Routes = [
  { path: '', component: LoginComponent },
  { path: 'login', component: LoginComponent },
  { path: 'home', component: HomeComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'products', component: ProductsPageComponent, canActivate: [permissionGuard], data: { permissions: ['product:read'] } },
  { path: 'employees', component: EmployeesPageComponent, canActivate: [permissionGuard], data: { permissions: ['employee:read'] } },
  { path: 'roles', component: RolesPageComponent, canActivate: [permissionGuard], data: { permissions: ['role:read'] } },
  { path: 'rules', component: RulesPageComponent, canActivate: [permissionGuard], data: { permissions: ['rule:read'] } },
  { path: 'import', component: ImportTemplatePageComponent, canActivate: [permissionGuard], data: { permissions: ['import:configure'] } },
  { path: 'delivery', component: DeliveryPageComponent, canActivate: [permissionGuard], data: { permissions: ['delivery:read'] } },
];
