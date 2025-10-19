import { Injectable } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { NavItem } from './nav.model';
import { AuthService } from '../auth.service';
import { ActivatedRouteSnapshot, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

@Injectable({ providedIn: 'root' })
export class NavService {
  constructor(private auth: AuthService, private translate: TranslateService, private router: Router) {}

  private allItems(): NavItem[] {
    return [
      { labelKey: 'menu.home', icon: 'pi pi-home', route: '/home' },
      { labelKey: 'menu.products', icon: 'pi pi-box', route: '/products', permissions: ['product:read'] },
      { labelKey: 'menu.employees', icon: 'pi pi-users', route: '/employees', permissions: ['employee:read'] },
      { labelKey: 'menu.delivery', icon: 'pi pi-truck', route: '/delivery', permissions: ['delivery:read'] },
      { labelKey: 'menu.rules', icon: 'pi pi-sliders-h', route: '/rules', permissions: ['rule:read'] },
      { labelKey: 'menu.roles', icon: 'pi pi-id-card', route: '/roles', permissions: ['role:read'] },
      { labelKey: 'menu.import', icon: 'pi pi-spin pi-cog', route: '/import', permissions: ['import:configure'] },
    ];
  }

  private allowed(item: NavItem): boolean {
    const req = item.permissions || [];
    // If no specific permissions required, always allow
    if (req.length === 0) return true;
    // If user's token has no permissions claim, optimistically show the item (UI visibility)
    // This avoids empty menus when backend doesn't yet populate permissions.
    try {
      const userPerms = this.auth.permissions();
      if (!userPerms || userPerms.length === 0) return true;
    } catch {
      // In case of any parsing error, do not block the menu visibility
      return true;
    }
    // Otherwise enforce permission check
    return this.auth.hasAny(req);
  }

  private toMenuItem(item: NavItem): MenuItem | null {
    if (!this.allowed(item)) return null;
    const children = (item.children || []).map((c) => this.toMenuItem(c)).filter(Boolean) as MenuItem[];
    const menuItem: MenuItem = {
      label: this.translate.instant(item.labelKey),
      icon: item.icon,
      routerLink: item.route, // keep routerLink for standard navigation
      command: () => {
        if (item.route) {
          // Ensure absolute navigation
          this.router.navigateByUrl(item.route);
        }
      },
      items: children.length ? children : undefined
    };
    return menuItem;
  }

  // Expose a MenuItem[] for PanelMenu with translated labels
  menuItems(): MenuItem[] {
    return this.allItems().map((i) => this.toMenuItem(i)).filter(Boolean) as MenuItem[];
  }

  // Build breadcrumb model from route data recursively with translated labels
  breadcrumbsFromRoute(root: ActivatedRouteSnapshot): MenuItem[] {
    const out: MenuItem[] = [];
    const t = this.translate;
    function traverse(node?: ActivatedRouteSnapshot) {
      if (!node) return;
      const key = node.data && node.data['breadcrumb'];
      if (key) {
        out.push({ label: t.instant(key) });
      }
      const firstChild = node.firstChild;
      if (firstChild) traverse(firstChild);
    }
    traverse(root);
    return out;
  }
}
