import { Component, OnInit, inject, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, finalize, filter, tap, switchMap } from 'rxjs';
import { InspectorsService } from '../../../../core/services/inspectors.service';
import { Inspector } from '../../../../core/models/inspector.interface';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner.component';
import { SelectInputComponent } from '../../../../shared/components/inputs/select-input/select-input.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { LucideAngularModule, ShieldCheck, Scale, FileSignature, CheckCircle2, Info } from 'lucide-angular';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-report-compliance',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SpinnerComponent,
    SelectInputComponent,
    SkeletonComponent,
    LucideAngularModule
  ],
  templateUrl: './report-compliance.component.html',
  styleUrl: './report-compliance.component.scss'
})
export class ReportComplianceComponent implements OnInit {
  private fb = inject(FormBuilder);
  private inspectorsService = inject(InspectorsService);
  private destroyRef = inject(DestroyRef);

  readonly icons = { ShieldCheck, Scale, FileSignature, CheckCircle2, Info };
  readonly sopOptions = ['InterNACHI', 'ASHI', 'TREC', 'Custom'];

  private readonly legalTemplates: Record<string, string> = {
    'InterNACHI': 'It is a visual inspection of the property and its accessible components at the time of the inspection. The goal is to identify material defects that are both observed and deemed significant.',
    'ASHI': 'The inspector will report on those systems and components specified by the ASHI Standards of Practice that, in the professional judgment of the inspector, are not functioning properly, are significantly deficient, or are unsafe.',
    'TREC': 'The standard inspection report form is used, and the inspection is performed according to TREC rules and Standards of Practice.',
    'Custom': ''
  };

  complianceForm: FormGroup = this.fb.group({
    sop_name: ['InterNACHI'],
    custom_legal_disclaimer: [''],
    use_standard_definitions: [true],
    custom_safety_hazard_def: [''],
    custom_major_defect_def: [''],
  });

  isLoading = signal<boolean>(true);

  ngOnInit(): void {
    this.loadComplianceData();
    this.setupSopChangeListener();
  }

  loadComplianceData(): void {
    this.isLoading.set(true);
    this.inspectorsService.getProfile()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (data) => {
          this.complianceForm.patchValue({
            sop_name: data.sop_name || 'InterNACHI',
            custom_legal_disclaimer: data.custom_legal_disclaimer || '',
            use_standard_definitions: data.use_standard_definitions ?? true,
            custom_safety_hazard_def: data.custom_safety_hazard_def || '',
            custom_major_defect_def: data.custom_major_defect_def || '',
          }, { emitEvent: false });
          this.setupAutoSave();
        },
        error: (err) => console.error('Failed to load compliance data', err)
      });
  }

  private setupSopChangeListener(): void {
    this.complianceForm.get('sop_name')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(sopName => {
        const template = this.legalTemplates[sopName];
        if (template !== undefined) {
          // Only overwrite if current disclaimer is empty or matches another template
          const currentDisclaimer = this.complianceForm.get('custom_legal_disclaimer')?.value;
          const isTemplate = Object.values(this.legalTemplates).includes(currentDisclaimer);
          
          if (!currentDisclaimer || isTemplate) {
            this.complianceForm.patchValue({ custom_legal_disclaimer: template });
          }
        }
      });
  }

  private setupAutoSave(): void {
    this.complianceForm.valueChanges
      .pipe(
        debounceTime(environment.defaultDebounceTime),
        distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
        tap(() => this.inspectorsService.isSaving.set(true)),
        switchMap(values => this.inspectorsService.updateProfile(values).pipe(
          finalize(() => this.inspectorsService.isSaving.set(false))
        )),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => this.inspectorsService.lastSavedAt.set(new Date()),
        error: (err) => console.error('Auto-save failed', err)
      });
  }
}
