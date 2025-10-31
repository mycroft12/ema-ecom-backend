export interface NotificationEntryDto {
  id: string;
  domain: string;
  action: string;
  rowId: string;
  rowNumber?: number;
  changedColumns?: string[];
  read: boolean;
  createdAt: string;
}
