import { SubscriptionStatus } from '../enums/subscription-status.enum';

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
  signature_url?: string;
  sop_name?: string;
  custom_legal_disclaimer?: string;
  use_standard_definitions?: boolean;
  custom_safety_hazard_def?: string;
  custom_major_defect_def?: string;
  custom_minor_defect_def?: string;
  custom_maintenance_item_def?: string;
  subscription_status: SubscriptionStatus;
  free_inspections_used: number;
  created_at: Date;
  updated_at: Date;
}
