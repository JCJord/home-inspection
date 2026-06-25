import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule, ArrowLeft } from 'lucide-angular';
import { SeoService } from '../../../core/services/seo.service';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './privacy.component.html',
  providers: [
    {
      provide: 'lucideIcons',
      useValue: { ArrowLeft }
    }
  ]
})
export class PrivacyComponent implements OnInit {
  private seoService = inject(SeoService);

  ngOnInit() {
    this.seoService.generateTags({
      title: 'Privacy Policy | Inspectly',
      description: 'Read the Privacy Policy of Inspectly. We are committed to protecting the privacy of home inspectors and their clients.',
      url: `${window.location.origin}/privacy`
    });
  }
}
