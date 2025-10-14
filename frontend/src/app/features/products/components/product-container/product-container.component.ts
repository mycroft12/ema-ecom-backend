import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductSchemaService } from '../../services/product-schema.service';
import { CardModule } from 'primeng/card';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { SchemaConfigurationComponent } from '../schema-configuration/schema-configuration.component';
import { ProductTableComponent } from '../product-table/product-table.component';

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

  ngOnInit(): void {
    // Load the schema to determine if the product_config table is configured
    // The loadSchema method first checks if the product_config table exists
    // If it exists, it will set isConfigured to true and show the product table
    // If it doesn't exist, it will set isConfigured to false and show the configuration component
    this.schemaService.loadSchema();
  }
}
