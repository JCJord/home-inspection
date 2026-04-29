import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { TemplatesService } from '../../services/templates.service';
import { LucideAngularModule, ArrowLeft, AlertCircle, FileText } from 'lucide-angular';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { TextInputComponent } from '../../../../shared/components/inputs/text-input/text-input.component';

@Component({
  selector: 'app-template-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    ButtonComponent,
    TextInputComponent
  ],
  templateUrl: './template-form.component.html',
  styleUrl: './template-form.component.scss',
})
export class TemplateFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private templatesService = inject(TemplatesService);

  templateForm!: FormGroup;
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  cloneOfId = signal<string | null>(null);

  readonly icons = {
    ArrowLeft,
    AlertCircle,
    FileText
  };

  ngOnInit(): void {
    this.templateForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]]
    });

    const cloneId = this.route.snapshot.queryParams['cloneOf'];
    if (cloneId) {
      this.cloneOfId.set(cloneId);
      this.fetchSourceTemplate(cloneId);
    }
  }

  private fetchSourceTemplate(id: string): void {
    this.isLoading.set(true);
    this.templatesService.getTemplate(id).subscribe({
      next: (srcTemplate) => {
        this.isLoading.set(false);
        this.templateForm.patchValue({
          name: `Copy of ${srcTemplate.name}`
        });
      },
      error: (err) => {
        console.error('Failed to load source blueprint for cloning', err);
        this.isLoading.set(false);
        this.errorMessage.set('Could not pull the original blueprint metadata.');
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/templates']);
  }

  onSubmit(): void {
    if (this.templateForm.invalid) {
      this.templateForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    const name = this.templateForm.value.name.trim();

    const action$ = this.cloneOfId()
      ? this.templatesService.cloneTemplate(this.cloneOfId()!, name)
      : this.templatesService.createTemplate(name);

    action$.subscribe({
      next: (created) => {
        this.isLoading.set(false);
        this.router.navigate(['/templates', created.id]);
      },
      error: (err) => {
        console.error('Failed to submit blueprint form', err);
        this.errorMessage.set(`Failed to ${this.cloneOfId() ? 'clone' : 'create'} blueprint.`);
        this.isLoading.set(false);
      }
    });
  }
}
