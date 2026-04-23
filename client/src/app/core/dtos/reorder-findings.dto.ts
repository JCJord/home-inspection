export interface FindingOrderDto {
  id: string;
  sort_order: number;
}

export interface ReorderFindingsDto {
  findings: FindingOrderDto[];
}
