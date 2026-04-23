import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InspectionsService } from '../../../../core/services/inspections.service';
import { Inspection } from '../../../../core/models/inspection.interface';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { ClipboardList, LucideAngularModule, Plus } from 'lucide-angular';
import { InspectionFormComponent } from '../../components/inspection-form/inspection-form.component';
import { InspectionCardComponent } from '../../components/inspection-card/inspection-card.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-inspections',
  standalone: true,
  imports: [CommonModule, ButtonComponent, LucideAngularModule, InspectionFormComponent, InspectionCardComponent, PaginationComponent, SkeletonComponent],
  templateUrl: './inspections.component.html',
  styleUrl: './inspections.component.scss',
})
export class InspectionsComponent implements OnInit {
  private inspectionsService = inject(InspectionsService);

  inspections = signal<Inspection[]>([]);
  isLoading = signal<boolean>(true);
  isFormOpen = signal<boolean>(false);
  editingInspection = signal<Inspection | null>(null);
  
  currentPage = signal<number>(1);
  totalItems = signal<number>(0);
  itemsPerPage = signal<number>(10);

  readonly icons = { Plus, ClipboardList };

  ngOnInit(): void {
    this.loadInspections();
  }

  loadInspections(): void {
    this.isLoading.set(true);
    this.inspectionsService.getInspections(this.currentPage(), this.itemsPerPage()).subscribe({
      next: (res) => {
        this.inspections.set(res.data);
        this.totalItems.set(res.meta.total);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load inspections', err);
        this.isLoading.set(false);
      },
    });
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadInspections();
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

  deleteInspection(inspection: Inspection): void {
    this.inspectionsService.deleteInspection(inspection.id).subscribe({
      next: () => {
        // Optimistically remove from UI
        this.inspections.update(list => list.filter(i => i.id !== inspection.id));
        this.totalItems.update(t => t - 1);
      },
      error: (err) => {
        console.error('Failed to delete inspection', err);
        // We could show a toast notification here in the future
      }
    });
  }
}
