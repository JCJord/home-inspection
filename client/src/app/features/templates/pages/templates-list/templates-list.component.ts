import { Component, OnInit, signal, inject, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TemplatesService } from '../../services/templates.service';
import { InspectorsService } from '../../../../core/services/inspectors.service';
import { Template } from '../../models/template.interface';
import { LucideAngularModule, Copy, Edit2, Trash2, Plus, Star } from 'lucide-angular';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { TemplateEditorComponent } from '../template-editor/template-editor.component';
import { TemplateCardComponent } from '../../components/template-card/template-card.component';

@Component({
  selector: 'app-templates-list',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, ButtonComponent, TemplateEditorComponent, TemplateCardComponent],

  providers: [{ provide: 'lucideIcons', useValue: { Copy, Edit2, Trash2, Plus, Star } }],
  templateUrl: './templates-list.component.html',
  styleUrl: './templates-list.component.scss'
})
export class TemplatesListComponent implements OnInit {
  private templatesService = inject(TemplatesService);
  private inspectorsService = inject(InspectorsService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  templates = signal<Template[]>([]);
  isLoading = signal<boolean>(true);
  errorMessage = signal<string | null>(null);
  
  preferredTemplateId = signal<string | null>(null);
  searchQuery = signal<string>('');
  isActionLoading = signal<boolean>(false);
  selectedTemplateId = signal<string | null>(null);

  readonly icons = { Copy, Edit2, Trash2, Plus, Star };

  filteredTemplates = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const items = this.templates();
    if (!query) return items;
    return items.filter(t => t.name.toLowerCase().includes(query));
  });

  customTemplates = computed(() => this.filteredTemplates().filter(t => t.inspector_id !== null));
  systemTemplates = computed(() => this.filteredTemplates().filter(t => !t.inspector_id));

  ngOnInit(): void {
    this.loadTemplates();
    this.loadProfile();
  }

  loadProfile(): void {
    this.inspectorsService.getProfile().subscribe({
      next: (profile) => {
        const backendPref = (profile as any).preferred_template_id;
        const localPref = localStorage.getItem(`preferred_template_${profile.id}`);
        this.preferredTemplateId.set(backendPref || localPref || null);
      },
      error: (err) => console.error('Failed to load profile info', err)
    });
  }

  loadTemplates(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.cdr.detectChanges();

    this.templatesService.getTemplates().subscribe({
      next: (data) => {
        this.templates.set(data);
        this.isLoading.set(false);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load templates', err);
        const msg = err.status === 401 
          ? 'Session expired. Please log in again.' 
          : (err.status === 0 ? 'Cannot connect to backend server.' : 'Could not load inspection templates.');
        this.errorMessage.set(msg);
        this.isLoading.set(false);
        this.cdr.detectChanges();
      }
    });
  }

  createNewTemplate(): void {
    const name = window.prompt('Enter a name for your new custom template:', 'New Blueprint');
    if (name && name.trim()) {
      this.isActionLoading.set(true);
      this.templatesService.createTemplate(name.trim()).subscribe({
        next: (created) => {
          this.isActionLoading.set(false);
          this.router.navigate(['/templates', created.id]);
        },
        error: (err) => {
          console.error('Failed to create template', err);
          this.isActionLoading.set(false);
          alert('Failed to create template.');
        }
      });
    }
  }

  cloneTemplate(template: Template): void {
    const newName = window.prompt('Enter a name for the cloned template:', `Copy of ${template.name}`);
    if (newName && newName.trim()) {
      this.isActionLoading.set(true);
      this.templatesService.cloneTemplate(template.id, newName.trim()).subscribe({
        next: (cloned) => {
          this.isActionLoading.set(false);
          this.router.navigate(['/templates', cloned.id]);
        },
        error: (err) => {
          console.error('Failed to clone template', err);
          this.isActionLoading.set(false);
          alert('Failed to clone template.');
        }
      });
    }
  }

  editTemplate(template: Template): void {
    this.router.navigate(['/templates', template.id]);
  }

  deleteTemplate(template: Template): void {
    if (!template.inspector_id) {
      alert('Cannot delete a system default template.');
      return;
    }

    if (window.confirm(`Are you sure you want to delete the template "${template.name}"?`)) {
      this.isActionLoading.set(true);
      this.templatesService.deleteTemplate(template.id).subscribe({
        next: () => {
          this.isActionLoading.set(false);
          this.loadTemplates();
        },
        error: (err) => {
          console.error('Failed to delete template', err);
          this.isActionLoading.set(false);
          alert('Failed to delete template.');
        }
      });
    }
  }
}

