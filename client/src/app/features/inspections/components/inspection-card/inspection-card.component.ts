import { Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Inspection } from '../../../../core/models/inspection.interface';
import { Severity } from '../../../../core/enums/inspection.enums';
import { LucideAngularModule, MapPin, User, Calendar, AlertTriangle, AlertCircle, Info, CheckCircle2, ChevronRight, Edit2, Trash2 } from 'lucide-angular';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { DropdownMenuComponent, DropdownItem } from '../../../../shared/components/dropdown-menu/dropdown-menu.component';

@Component({
  selector: 'app-inspection-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, ButtonComponent, DropdownMenuComponent],
  templateUrl: './inspection-card.component.html',
  styleUrl: './inspection-card.component.scss',
})
export class InspectionCardComponent {
  inspection = input.required<Inspection>();

  view = output<Inspection>();
  edit = output<Inspection>();
  delete = output<Inspection>();

  readonly icons = {
    MapPin,
    User,
    Calendar,
    AlertTriangle,
    AlertCircle,
    Info,
    CheckCircle2,
    ChevronRight,
    Edit2,
    Trash2
  };

  menuItems = computed<DropdownItem[]>(() => [
    {
      label: 'Edit',
      icon: this.icons.Edit2,
      action: () => this.edit.emit(this.inspection()),
    },
    {
      label: 'Delete',
      icon: this.icons.Trash2,
      danger: true,
      action: () => {
        if (confirm('Are you sure you want to delete this inspection?')) {
          this.delete.emit(this.inspection());
        }
      },
    }
  ]);

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
