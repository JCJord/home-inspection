import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InspectionsService } from '../../../../core/services/inspections.service';
import { Inspection } from '../../../../core/models/inspection.interface';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { ClipboardList, LucideAngularModule, Plus, RefreshCw } from 'lucide-angular';
import { CreateInspectionComponent } from '../create-inspection/create-inspection.component';

@Component({
  selector: 'app-inspections',
  standalone: true,
  imports: [CommonModule, ButtonComponent, LucideAngularModule, CreateInspectionComponent],
  templateUrl: './inspections.component.html',
  styleUrl: './inspections.component.scss',
})
export class InspectionsComponent implements OnInit {
  private inspectionsService = inject(InspectionsService);

  inspections = signal<Inspection[]>([]);
  isLoading = signal<boolean>(true);
  isFormOpen = signal<boolean>(false);

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
    this.isFormOpen.update((val) => !val);
  }

  closeForm(): void {
    this.isFormOpen.set(false);
  }

  onInspectionCreated(data: any): void {
    console.log('Inspection created (mock):', data);
    this.closeForm();
    // For now, we only log as requested by the user
  }
}
