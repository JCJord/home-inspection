export interface CreateInspectionDto {
  address?: string;
  client_name: string;
  client_email?: string;
  client_phone?: string;
  year_built?: number;
  square_footage?: number;
  section_statuses?: Record<string, any>;
  template_id?: string;
  scheduled_date?: string;
  agreed_price?: number;
}
