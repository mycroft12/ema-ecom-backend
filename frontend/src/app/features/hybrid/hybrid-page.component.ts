import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HYBRID_ENTITY_DISPLAY_NAME, HYBRID_ENTITY_TYPE, HYBRID_TRANSLATION_PREFIX } from './hybrid.tokens';
import { HybridContainerComponent } from './components/hybrid-container/hybrid-container.component';
import { HybridSchemaService } from './services/hybrid-schema.service';
import { HybridTableDataService } from './services/hybrid-table-data.service';

@Component({
  selector: 'app-hybrid-page',
  standalone: true,
  imports: [HybridContainerComponent],
  providers: [
    HybridSchemaService,
    HybridTableDataService,
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
  template: `<app-hybrid-container />`
})
export class HybridPageComponent {}
