import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InspectionsService } from '../../../../core/services/inspections.service';
import { Inspection } from '../../../../core/models/inspection.interface';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { ClipboardList, LucideAngularModule, Plus, RefreshCw } from 'lucide-angular';
import { InspectionFormComponent } from '../../components/inspection-form/inspection-form.component';
import { InspectionCardComponent } from '../../components/inspection-card/inspection-card.component';

@Component({
  selector: 'app-inspections',
  standalone: true,
  imports: [CommonModule, ButtonComponent, LucideAngularModule, InspectionFormComponent, InspectionCardComponent],
  templateUrl: './inspections.component.html',
  styleUrl: './inspections.component.scss',
})
export class InspectionsComponent implements OnInit {
  private inspectionsService = inject(InspectionsService);

  inspections = signal<Inspection[]>([]);
  isLoading = signal<boolean>(true);
  isFormOpen = signal<boolean>(false);
  editingInspection = signal<Inspection | null>(null);

  readonly icons = { Plus, RefreshCw, ClipboardList };

  ngOnInit(): void {
    this.loadInspections();
  }

  loadInspections(): void {
    this.isLoading.set(true);
    this.inspectionsService.getInspections().subscribe({
      next: (data) => {
        this.inspections.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load inspections', err);
        this.isLoading.set(false);
      },
    });
  }

  toggleForm(): void {
    if (!this.isFormOpen()) {
      this.editingInspection.set(null);
    }
    this.isFormOpen.update((val) => !val);
  }

  editInspection(inspection: Inspection): void {
    this.editingInspection.set(inspection);
    this.isFormOpen.set(true);
  }

  closeForm(): void {
    this.isFormOpen.set(false);
    this.editingInspection.set(null);
  }

  onSaved(data: Inspection): void {
    this.closeForm();
    this.loadInspections();
  }
}
