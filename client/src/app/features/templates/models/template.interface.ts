export interface TemplatePreset {
  title: string;
  description: string;
  recommendation?: string;
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

export interface Template {
  id: string;
  name: string;
  inspector_id: string | null;
  structure: TemplateStructure;
  created_at: string;
  updated_at: string;
}
