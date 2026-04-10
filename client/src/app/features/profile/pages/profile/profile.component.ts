import { Component, OnInit, inject, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, finalize, switchMap, filter, tap } from 'rxjs';
import { InspectorsService } from '../../../../core/services/inspectors.service';
import { Inspector } from '../../../../core/interfaces/inspector.interface';
import { TextInputComponent } from '../../../../shared/components/inputs/text-input/text-input.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner.component';
import { LucideAngularModule, Camera, User, BadgeCheck, Phone, Mail, Building, FileText, CheckCircle2 } from 'lucide-angular';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TextInputComponent,
    SpinnerComponent,
    LucideAngularModule
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private inspectorsService = inject(InspectorsService);
  private destroyRef = inject(DestroyRef);

  readonly icons = { Camera, User, BadgeCheck, Phone, Mail, Building, FileText, CheckCircle2 };

  profileForm: FormGroup = this.fb.group({
    name: ['', [Validators.required]],
    company_name: [''],
    phone: [''],
    license_number: [''],
  });

  profile = signal<Inspector | null>(null);
  isLoading = signal<boolean>(true);
  isSaving = signal<boolean>(false);
  isUploading = signal<boolean>(false);
  message = signal<{ type: 'success' | 'error', text: string } | null>(null);
  logoPreview = signal<string | null>(null);
  lastSavedAt = signal<Date | null>(null);

  private messageTimeout: any;

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.isLoading.set(true);
    this.inspectorsService.getProfile()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (data) => {
          this.profile.set(data);
          // Set initial values without triggering the auto-save subscription
          this.profileForm.patchValue(data, { emitEvent: false });
          if (data.logo_url) {
            const logoUrl = data.logo_url.startsWith('http')
              ? data.logo_url
              : `${environment.apiUrl}${data.logo_url}`;
            this.logoPreview.set(logoUrl);
          }
          this.setupAutoSave();
        },
        error: (err) => {
          this.showMessage('error', 'Failed to load profile');
          console.error(err);
        }
      });
  }

  private setupAutoSave(): void {
    this.profileForm.valueChanges
      .pipe(
        filter(() => this.profileForm.valid),
        debounceTime(environment.defaultDebounceTime),
        distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
        tap(() => {
          this.isSaving.set(true);
          this.message.set(null);
        }),
        switchMap(values => this.inspectorsService.updateProfile(values).pipe(
          finalize(() => this.isSaving.set(false))
        )),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (updated) => {
          this.profile.set(updated);
          this.lastSavedAt.set(new Date());
        },
        error: (err) => {
          this.showMessage('error', 'Auto-save failed. Your changes might not be saved.');
          console.error(err);
        }
      });
  }

  private showMessage(type: 'success' | 'error', text: string): void {
    if (this.messageTimeout) {
      clearTimeout(this.messageTimeout);
    }
    this.message.set({ type, text });
    this.messageTimeout = setTimeout(() => this.message.set(null), 5000);
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      // Preview
      const reader = new FileReader();
      reader.onload = () => {
        this.logoPreview.set(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload
      this.uploadLogo(file);
    }
  }

  private uploadLogo(file: File): void {
    this.isUploading.set(true);
    this.inspectorsService.uploadLogo(file)
      .pipe(finalize(() => this.isUploading.set(false)))
      .subscribe({
        next: (updated) => {
          this.profile.set(updated);
          if (updated.logo_url) {
            const logoUrl = updated.logo_url.startsWith('http')
              ? updated.logo_url
              : `${environment.apiUrl}${updated.logo_url}`;
            this.logoPreview.set(logoUrl);
          }
          this.showMessage('success', 'Logo uploaded successfully');
        },
        error: (err) => {
          this.showMessage('error', 'Failed to upload logo');
          console.error(err);
        }
      });
  }
}
