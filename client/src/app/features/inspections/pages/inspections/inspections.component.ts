import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { InspectionsService } from '../../../../core/services/inspections.service';
import { Inspection } from '../../../../core/models/inspection.interface';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { ClipboardList, LucideAngularModule, Plus } from 'lucide-angular';
import { InspectionCardComponent } from '../../components/inspection-card/inspection-card.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { SearchInputComponent } from '../../../../shared/components/inputs/search-input/search-input.component';

@Component({
  selector: 'app-inspections',
  standalone: true,
  imports: [
    CommonModule,
    ButtonComponent,
    LucideAngularModule,
    InspectionCardComponent,
    PaginationComponent,
    SkeletonComponent,
    SearchInputComponent,
    ReactiveFormsModule
  ],
  templateUrl: './inspections.component.html',
  styleUrl: './inspections.component.scss',
})
export class InspectionsComponent implements OnInit {
  private inspectionsService = inject(InspectionsService);
  private router = inject(Router);

  inspections = this.inspectionsService.inspections;
  isLoading = this.inspectionsService.isLoading;
  totalItems = this.inspectionsService.totalCount;

  currentPage = signal<number>(1);
  itemsPerPage = signal<number>(10);

  searchQuery = signal<string>('');
  public searchControl = new FormControl<string>('', { nonNullable: true });
  statusFilter = signal<'all' | 'in_progress' | 'published' | 'cancelled'>('all');

  readonly icons = { Plus, ClipboardList };

  ngOnInit(): void {
    this.loadInspections();
    this.setupSearch();
  }

  setupSearch(): void {
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(value => {
      this.searchQuery.set(value);
      this.currentPage.set(1);
      this.loadInspections();
    });
  }

  setStatusFilter(filter: 'all' | 'in_progress' | 'published' | 'cancelled'): void {
    this.statusFilter.set(filter);
    this.currentPage.set(1);
    this.loadInspections();
  }

  loadInspections(): void {
    const status = this.statusFilter() === 'all' ? undefined : this.statusFilter();
    const search = this.searchQuery().trim() || undefined;
    this.inspectionsService.getInspections(this.currentPage(), this.itemsPerPage(), true, status, search).subscribe();
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
      error: (err) => {
        console.error('Failed to delete inspection', err);
        // Refresh to rollback cache if needed
        this.loadInspections();
      },
    });
  }
}
