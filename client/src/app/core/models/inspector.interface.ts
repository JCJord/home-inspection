import { SubscriptionStatus } from '../enums/subscription-status.enum';

export interface Inspector {
  id: string;
  email: string;
  name: string;
  company_name?: string;
  phone?: string;
  license_number?: string;
  logo_url?: string;
  subscription_status: SubscriptionStatus;
  free_inspections_used: number;
  created_at: Date;
  updated_at: Date;
}
