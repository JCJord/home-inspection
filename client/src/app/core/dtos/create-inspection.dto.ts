export interface CreateInspectionDto {
  address: string;
  client_name: string;
  client_email: string;
  year_built: number;
  square_footage?: number;
}
