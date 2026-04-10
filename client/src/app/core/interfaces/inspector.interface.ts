export interface Inspector {
  id: string;
  email: string;
  name: string;
  company_name?: string;
  phone?: string;
  license_number?: string;
  logo_url?: string;
  subscription_status: 'free' | 'pro' | 'enterprise';
  free_inspections_used: number;
  created_at: Date;
  updated_at: Date;
}
