import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductContainerComponent } from './components/product-container/product-container.component';

@Component({
  selector: 'app-products-page',
  standalone: true,
  imports: [CommonModule, ProductContainerComponent],
  template: `
    <app-product-container />
  `
})
export class ProductsPageComponent {}
