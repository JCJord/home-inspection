import { Section, Severity } from '../enums/inspection.enums';

export interface CreateFindingDto {
  section: string;
  severity: Severity;
  location?: string;
  short_note: string;
  ai_comment?: string;
  recommendation?: string;
  sort_order?: number;
}
