import { Component, input, inject, Output, EventEmitter } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule, ArrowLeft } from 'lucide-angular';

@Component({
  selector: 'app-back-button',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './back-button.component.html',
  styleUrl: './back-button.component.scss'
})
export class BackButtonComponent {
  private location = inject(Location);
  private router = inject(Router);

  fallbackUrl = input<string | any[] | null>(null);
  @Output() clicked = new EventEmitter<void>();

  readonly icons = { ArrowLeft };

  onBackClick(event: Event): void {
    event.stopPropagation();
    
    // Emit clicked event if parent wants to handle it manually
    if (this.clicked.observed) {
      this.clicked.emit();
      return;
    }

    // Fallback URL routing
    const fallback = this.fallbackUrl();
    if (fallback) {
      if (typeof fallback === 'string') {
        this.router.navigate([fallback]);
      } else if (Array.isArray(fallback)) {
        this.router.navigate(fallback);
      }
    } else {
      // Default: standard browser back
      this.location.back();
    }
  }
}
