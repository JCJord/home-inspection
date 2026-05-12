import { Component, Input, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Inspection } from '../../../../core/models/inspection.interface';
import { LucideAngularModule, AlertCircle, CheckCircle2, ShieldAlert, ListChecks, FileText, Loader2 } from 'lucide-angular';

@Component({
  selector: 'app-summary-dashboard',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './summary-dashboard.component.html',
  styleUrl: './summary-dashboard.component.scss'
})
export class SummaryDashboardComponent {
  @Input() set inspection(val: Inspection | null) {
    this._inspection.set(val);
  }
  
  private _inspection = signal<Inspection | null>(null);
  readonly icons = { AlertCircle, CheckCircle2, ShieldAlert, ListChecks, FileText, Loader2 };

  stats = computed(() => {
    const insp = this._inspection();
    if (!insp) return null;

    const findings = insp.findings || [];
    const sections = insp.template_snapshot?.sections || [];
    const sectionStatuses = insp.section_statuses || {};

    let safety = 0, major = 0, minor = 0, maintenance = 0;

    findings.forEach(f => {
      const s = f.severity.toLowerCase();
      if (s === 'safety' || s === 'critical') safety++;
      else if (s === 'major') major++;
      else if (s === 'minor') minor++;
      else if (s === 'maintenance') maintenance++;
    });

    let inspectedSectionsCount = 0;
    sections.forEach(s => {
      const status = sectionStatuses[s.name]?.status || 'inspected';
      if (status === 'inspected') inspectedSectionsCount++;
    });

    return {
      totalFindings: findings.length,
      severity: { safety, major, minor, maintenance },
      inspectedSections: inspectedSectionsCount,
      totalSections: sections.length
    };
  });
}
