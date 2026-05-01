import { Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Inspection } from '../../../../core/models/inspection.interface';
import { Severity } from '../../../../core/enums/inspection.enums';
import { LucideAngularModule, MapPin, User, Calendar, AlertTriangle, AlertCircle, Info, CheckCircle2, ChevronRight, Edit2, Trash2 } from 'lucide-angular';
import { DropdownMenuComponent, DropdownItem } from '../../../../shared/components/dropdown-menu/dropdown-menu.component';
import { ConfirmModalComponent } from '../../../../shared/components/confirm-modal/confirm-modal.component';
import { ConfirmPillComponent } from '../../../../shared/components/confirm-pill/confirm-pill.component';

@Component({
  selector: 'app-inspection-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, DropdownMenuComponent, ConfirmModalComponent, ConfirmPillComponent],
  templateUrl: './inspection-card.component.html',
  styleUrl: './inspection-card.component.scss',
})
export class InspectionCardComponent {
  private router = inject(Router);

  inspection = input.required<Inspection>();

  Severity = Severity;

  edit = output<Inspection>();
  delete = output<Inspection>();

  showDeleteModal = signal(false);
  isDeleting = signal(false);
  isConfirmingDelete = signal(false);

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
      action: () => this.isConfirmingDelete.set(true),
    }
  ]);

  confirmDelete() {
    this.isConfirmingDelete.set(false);
    this.isDeleting.set(true);

    // Wait for the animation to complete before emitting the delete event
    setTimeout(() => {
      this.delete.emit(this.inspection());
      this.isDeleting.set(false); // Reset state for future use
    }, 400);
  }

  viewDetails() {
    this.router.navigate(['/inspections', this.inspection().id]);
  }

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

  totalFindings = computed(() => {
    const findings = this.inspection().findings;
    return Array.isArray(findings) ? findings.length : 0;
  });

  statusLabel = computed(() => {
    return this.inspection().status === 'published' ? 'Published' : 'In Progress';
  });
}
