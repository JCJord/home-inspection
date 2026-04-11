import { Section, Severity } from '../enums/inspection.enums';

export interface Photo {
  id: string;
  finding_id: string;
  storage_url: string;
  sort_order: number;
  uploaded_at: string;
}

export interface Finding {
  id: string;
  inspection_id: string;
  section: Section;
  severity: Severity;
  location?: string;
  short_note: string;
  ai_comment?: string;
  sort_order: number;
  photos: Photo[];
  created_at: string;
  updated_at: string;
}

export interface Inspection {
  id: string;
  address: string;
  client_name: string;
  client_email: string;
  year_built: number;
  square_footage?: number;
  status: 'in_progress' | 'published';
  findings?: Finding[];
  created_at: string;
  updated_at: string;
}
