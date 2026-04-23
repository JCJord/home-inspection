import { Section, Severity } from '../enums/inspection.enums';

export interface UpdateFindingDto {
  section?: Section;
  severity?: Severity;
  location?: string;
  short_note?: string;
  ai_comment?: string;
  sort_order?: number;
}
