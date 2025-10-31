import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductSchemaService } from '../../services/product-schema.service';
import { CardModule } from 'primeng/card';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { SchemaConfigurationComponent } from '../schema-configuration/schema-configuration.component';
import { ProductTableComponent } from '../product-table/product-table.component';
import { HYBRID_ENTITY_DISPLAY_NAME, HYBRID_ENTITY_TYPE, HYBRID_TRANSLATION_PREFIX } from '../../../hybrid/hybrid.tokens';
import { ProductDataService } from '../../services/product-data.service';

@Component({
  selector: 'app-product-container',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ProgressSpinnerModule,
    MessageModule,
    SchemaConfigurationComponent,
    ProductTableComponent
  ],
  templateUrl: './product-container.component.html',
  styleUrls: ['./product-container.component.scss']
})
export class ProductContainerComponent implements OnInit {
  readonly schemaService = inject(ProductSchemaService);
  private readonly dataService = inject(ProductDataService);
  private readonly entityType = inject(HYBRID_ENTITY_TYPE);
  private readonly translationPrefix = inject(HYBRID_TRANSLATION_PREFIX);
  private readonly entityDisplayName = inject(HYBRID_ENTITY_DISPLAY_NAME);

  ngOnInit(): void {
    // Align services with the active hybrid context before loading schema/data
    this.schemaService.configureContext({
      entityType: this.entityType,
      translationPrefix: this.translationPrefix,
      displayName: this.entityDisplayName
    });
    this.dataService.setEntityContext(this.schemaService.entityTypeName);
    this.schemaService.loadSchema();
  }
}
