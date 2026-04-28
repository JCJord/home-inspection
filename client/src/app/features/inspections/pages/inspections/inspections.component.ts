import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { InspectionsService } from '../../../../core/services/inspections.service';
import { Inspection } from '../../../../core/models/inspection.interface';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { ClipboardList, LucideAngularModule, Plus } from 'lucide-angular';
import { InspectionCardComponent } from '../../components/inspection-card/inspection-card.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-inspections',
  standalone: true,
  imports: [CommonModule, ButtonComponent, LucideAngularModule, InspectionCardComponent, PaginationComponent, SkeletonComponent],
  templateUrl: './inspections.component.html',
  styleUrl: './inspections.component.scss',
})
export class InspectionsComponent implements OnInit {
  private inspectionsService = inject(InspectionsService);
  private router = inject(Router);

  inspections = signal<Inspection[]>([]);
  isLoading = signal<boolean>(true);

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

  addInspection(): void {
    this.router.navigate(['/inspections/new']);
  }

  editInspection(inspection: Inspection): void {
    this.router.navigate(['/inspections', inspection.id, 'edit']);
  }

  deleteInspection(inspection: Inspection): void {
    this.inspectionsService.deleteInspection(inspection.id).subscribe({
      next: () => {
        this.inspections.update(list => list.filter(i => i.id !== inspection.id));
        this.totalItems.update(t => t - 1);
      },
      error: (err) => {
        console.error('Failed to delete inspection', err);
      },
    });
  }
}
