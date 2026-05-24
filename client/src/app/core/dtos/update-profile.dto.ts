export interface UpdateProfileDto {
  name?: string;
  company_name?: string;
  phone?: string;
  license_number?: string;
  signature?: string;
  certifications?: string;
  brand_primary_color?: string;
  brand_font_family?: string;
  report_footer_text?: string;
  sop_name?: string;
  custom_legal_disclaimer?: string | null;
  use_standard_definitions?: boolean;
  custom_safety_hazard_def?: string | null;
  custom_major_defect_def?: string | null;
  custom_minor_defect_def?: string | null;
  custom_maintenance_item_def?: string | null;
  custom_informational_item_def?: string | null;
  default_send_email_confirmation?: boolean;
}
