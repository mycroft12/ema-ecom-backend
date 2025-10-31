import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { HYBRID_ENTITY_DISPLAY_NAME, HYBRID_ENTITY_TYPE, HYBRID_TRANSLATION_PREFIX } from '../../hybrid.tokens';
import { HybridSchemaService } from '../../services/hybrid-schema.service';
import { HybridTableDataService } from '../../services/hybrid-table-data.service';
import { HybridSchemaConfigurationComponent } from '../schema-configuration/hybrid-schema-configuration.component';
import { HybridTableComponent } from '../hybrid-table/hybrid-table.component';

@Component({
  selector: 'app-hybrid-container',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ProgressSpinnerModule,
    MessageModule,
    HybridSchemaConfigurationComponent,
    HybridTableComponent
  ],
  templateUrl: './hybrid-container.component.html',
  styleUrls: ['./hybrid-container.component.scss']
})
export class HybridContainerComponent implements OnInit {
  readonly schemaService = inject(HybridSchemaService);
  private readonly dataService = inject(HybridTableDataService);
  private readonly entityType = inject(HYBRID_ENTITY_TYPE);
  private readonly translationPrefix = inject(HYBRID_TRANSLATION_PREFIX);
  private readonly entityDisplayName = inject(HYBRID_ENTITY_DISPLAY_NAME);

  ngOnInit(): void {
    this.schemaService.configureContext({
      entityType: this.entityType,
      translationPrefix: this.translationPrefix,
      displayName: this.entityDisplayName
    });
    this.dataService.setEntityContext(this.schemaService.entityTypeName);
    this.schemaService.loadSchema();
  }
}
