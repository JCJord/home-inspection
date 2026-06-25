import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule, AlertTriangle, ArrowLeft } from 'lucide-angular';
import { SeoService } from '../../core/services/seo.service';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './not-found.component.html',
  styleUrls: ['./not-found.component.scss'],
  providers: [
    {
      provide: 'lucideIcons',
      useValue: { AlertTriangle, ArrowLeft }
    }
  ]
})
export class NotFoundComponent implements OnInit {
  private seoService = inject(SeoService);

  readonly icons = { AlertTriangle, ArrowLeft };

  ngOnInit() {
    this.seoService.generateTags({
      title: '404 - Page Not Found | Inspectly',
      description: 'The page you are looking for does not exist or has been moved.',
      noindex: true
    });
  }
}
