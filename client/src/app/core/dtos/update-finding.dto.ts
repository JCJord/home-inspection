import { Section, Severity } from '../enums/inspection.enums';

export interface UpdateFindingDto {
  section?: string;
  severity?: Severity;
  location?: string;
  description?: string;
  recommendation?: string;
  sort_order?: number;
}
