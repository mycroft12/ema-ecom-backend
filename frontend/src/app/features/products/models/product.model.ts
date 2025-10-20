import { ColumnDefinition } from './product-schema.model';

export interface Product {
  id: string;
  [key: string]: any;
}

export interface RawProductDto {
  id: string;
  attributes: Record<string, any>;
}

export interface ProductPageResponse {
  content: RawProductDto[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  columns?: ColumnDefinition[];
}
