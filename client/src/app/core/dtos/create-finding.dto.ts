import { Section, Severity } from '../enums/inspection.enums';

export interface CreateFindingDto {
  section: string;
  severity: Severity;
  location?: string;
  description: string;
  recommendation?: string;
  sort_order?: number;
}
