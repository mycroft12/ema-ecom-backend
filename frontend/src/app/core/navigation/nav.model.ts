export interface NavItem {
  labelKey: string; // i18n key
  icon?: string;    // PrimeIcons name e.g. 'pi pi-home'
  route?: string;   // router link
  permissions?: string[]; // required any-of permissions
  children?: NavItem[];
}
