export interface UpdateInspectionDto {
  address?: string;
  client_name?: string;
  client_email?: string;
  year_built?: number;
  square_footage?: number;
  metadata_values?: Record<string, string>;
  section_statuses?: Record<string, any>;
}
