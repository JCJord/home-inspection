import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule, ArrowLeft } from 'lucide-angular';
import { SeoService } from '../../../core/services/seo.service';

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './terms.component.html',
  providers: [
    {
      provide: 'lucideIcons',
      useValue: { ArrowLeft }
    }
  ]
})
export class TermsComponent implements OnInit {
  private seoService = inject(SeoService);

  ngOnInit() {
    this.seoService.generateTags({
      title: 'Terms of Service | Inspectly',
      description: 'Read the Terms of Service of Inspectly. Understand the terms, guidelines, and agreements for using the home inspection software.',
      url: `${window.location.origin}/terms`
    });
  }
}
