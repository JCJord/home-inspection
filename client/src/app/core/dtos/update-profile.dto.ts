export interface UpdateProfileDto {
  name?: string;
  company_name?: string;
  phone?: string;
  license_number?: string;
  brand_primary_color?: string;
  brand_font_family?: string;
  report_footer_text?: string;
  sop_name?: string;
  custom_legal_disclaimer?: string;
  use_standard_definitions?: boolean;
  custom_safety_hazard_def?: string;
  custom_major_defect_def?: string;
}
