import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Inspection } from '../../../../core/models/inspection.interface';
import { Severity } from '../../../../core/enums/inspection.enums';
import { LucideAngularModule, MapPin, User, Calendar, AlertTriangle, AlertCircle, Info, CheckCircle2, ChevronRight } from 'lucide-angular';

@Component({
  selector: 'app-inspection-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './inspection-card.component.html',
  styleUrl: './inspection-card.component.scss',
})
export class InspectionCardComponent {
  inspection = input.required<Inspection>();

  readonly icons = {
    MapPin,
    User,
    Calendar,
    AlertTriangle,
    AlertCircle,
    Info,
    CheckCircle2,
    ChevronRight,
  };

  severityCounts = computed(() => {
    const findings = this.inspection().findings || [];
    const counts = {
      [Severity.SAFETY]: 0,
      [Severity.MAJOR]: 0,
      [Severity.MINOR]: 0,
      [Severity.MAINTENANCE]: 0,
    };

    findings.forEach((finding) => {
      counts[finding.severity]++;
    });

    return counts;
  });

  totalFindings = computed(() => (this.inspection().findings || []).length);

  statusLabel = computed(() => {
    return this.inspection().status === 'published' ? 'Published' : 'In Progress';
  });
}
