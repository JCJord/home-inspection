import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule, CheckCircle, XCircle, Zap, Shield, ChevronRight } from 'lucide-angular';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { SeoService } from '../../../core/services/seo.service';


@Component({
  selector: 'app-alternative-to-spectora',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule, ButtonComponent],
  templateUrl: './alternative-to-spectora.component.html',
})
export class AlternativeToSpectoraComponent implements OnInit {
  private seoService = inject(SeoService);

  readonly icons = { CheckCircle, XCircle, Zap, Shield, ChevronRight };

  ngOnInit() {
    this.seoService.generateTags({
      title: 'Best Spectora Alternative for Solo Home Inspectors | Inspectly',
      description: 'Tired of Spectora\'s price, complex template setups, and slow basements sync? Switch to Inspectly — the fast, offline-first home inspection report software designed for solo operators.',
      url: `${window.location.origin}/alternative-to-spectora`
    });

    // BreadcrumbList Schema
    this.seoService.injectSchema({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': [
        {
          '@type': 'ListItem',
          'position': 1,
          'name': 'Home',
          'item': window.location.origin
        },
        {
          '@type': 'ListItem',
          'position': 2,
          'name': 'Spectora Alternative',
          'item': `${window.location.origin}/alternative-to-spectora`
        }
      ]
    }, 'breadcrumb-schema');

    // SoftwareApplication Schema (omitting aggregateRating)
    this.seoService.injectSchema({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      'name': 'Inspectly',
      'operatingSystem': 'Web, Mobile, iOS, Android',
      'applicationCategory': 'BusinessApplication',
      'offers': {
        '@type': 'Offer',
        'price': '0.00',
        'priceCurrency': 'USD',
        'description': 'Free during early access'
      }
    }, 'software-schema');

  }

  trackEvent(eventName: string) {
    if ((window as any).gtag) {
      (window as any).gtag('event', eventName);
    }
  }
}
