export interface Product {
  id: number;
  [key: string]: any;
}

export interface ProductPageResponse {
  content: Product[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}
