
export interface Inspector {
  id: string;
  email: string;
  name: string;
  company_name?: string;
  phone?: string;
  license_number?: string;
  logo_url?: string;
  brand_primary_color?: string;
  brand_font_family?: string;
  report_footer_text?: string;
  signature?: string;
  certifications?: string;
  sop_name?: string;
  custom_legal_disclaimer?: string;
  use_standard_definitions?: boolean;
  custom_safety_hazard_def?: string;
  custom_major_defect_def?: string;
  custom_minor_defect_def?: string;
  custom_maintenance_item_def?: string;
  custom_informational_item_def?: string;
  default_send_email_confirmation?: boolean;
  created_at: Date;
  updated_at: Date;
}
