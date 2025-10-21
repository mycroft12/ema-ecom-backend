export interface TableLazyLoadEvent {
  first: number;
  rows: number;
  sortField?: string;
  sortOrder?: number;
  filters?: Record<string, any>;
  globalFilter?: string;
}
