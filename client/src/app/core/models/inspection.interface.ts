import { Section, Severity } from '../enums/inspection.enums';
import { Inspector } from './inspector.interface';

export interface Photo {
  id: string;
  finding_id: string;
  storage_url: string;
  sort_order: number;
  uploaded_at: string;
  caption?: string;
}

export interface TemplatePreset {
  title: string;
  description: string;
  severity: string;
}

export interface TemplateField {
  key: string;
  label: string;
  type: string;
}

export interface TemplateSection {
  name: string;
  icon_key: string;
  fields: TemplateField[];
  presets: TemplatePreset[];
}

export interface TemplateStructure {
  sections: TemplateSection[];
}

export interface Finding {
  id: string;
  inspection_id: string;
  section: string; // Changed from Section enum to string
  severity: Severity;
  location?: string;
  description: string;
  recommendation?: string;
  sort_order: number;
  photos: Photo[];
  created_at: string;
  updated_at: string;
}

export interface SectionStatus {
  status: 'inspected' | 'not_inspected' | 'not_present';
  reason?: string;
}

export interface Inspection {
  id: string;
  address: string;
  client_name: string;
  client_email?: string;
  client_phone?: string;
  year_built: number;
  square_footage?: number;
  status: 'in_progress' | 'published';
  findings?: Finding[];
  weather?: string;
  temperature?: number;
  occupancy?: string;
  attendees?: string;
  foundation_type?: string;
  cover_photo_url?: string;
  template_id?: string;
  template_snapshot?: TemplateStructure;
  metadata_values?: Record<string, string>;
  section_statuses?: Record<string, SectionStatus>;
  inspector?: Inspector;
  created_at: string;
  updated_at: string;
}
