export interface TableState {
  filters: Record<string, any>;
  sortField?: string;
  sortOrder?: number;
  rows: number;
  first: number;
}
