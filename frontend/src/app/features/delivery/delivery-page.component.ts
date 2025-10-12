import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-delivery-page',
  standalone: true,
  imports: [TranslateModule],
  template: `
    <h2>{{ 'menu.delivery' | translate }}</h2>
    <p>Placeholder for delivery providers list and CRUD UI.</p>
  `
})
export class DeliveryPageComponent {}
