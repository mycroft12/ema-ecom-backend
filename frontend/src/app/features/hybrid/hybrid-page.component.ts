import { Component, inject } from '@angular/core';
import { ProductContainerComponent } from '../products/components/product-container/product-container.component';
import { ActivatedRoute } from '@angular/router';
import { HYBRID_ENTITY_DISPLAY_NAME, HYBRID_ENTITY_TYPE, HYBRID_TRANSLATION_PREFIX } from './hybrid.tokens';
import { ProductSchemaService } from '../products/services/product-schema.service';
import { ProductDataService } from '../products/services/product-data.service';

@Component({
  selector: 'app-hybrid-page',
  standalone: true,
  imports: [ProductContainerComponent],
  providers: [
    ProductSchemaService,
    ProductDataService,
    {
      provide: HYBRID_ENTITY_TYPE,
      useFactory: () => {
        const route = inject(ActivatedRoute);
        return route.snapshot.data['entityType'] ?? 'product';
      }
    },
    {
      provide: HYBRID_TRANSLATION_PREFIX,
      useFactory: () => {
        const route = inject(ActivatedRoute);
        return route.snapshot.data['translationPrefix'] ?? 'products';
      }
    },
    {
      provide: HYBRID_ENTITY_DISPLAY_NAME,
      useFactory: () => {
        const route = inject(ActivatedRoute);
        return route.snapshot.data['displayName'] ?? 'Items';
      }
    }
  ],
  template: `<app-product-container />`
})
export class HybridPageComponent {}
