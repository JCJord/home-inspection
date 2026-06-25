import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule, CheckCircle, HelpCircle, ArrowRight, ShieldCheck, Zap } from 'lucide-angular';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { SeoService } from '../../core/services/seo.service';


@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule, ButtonComponent],
  templateUrl: './pricing.component.html',
  styleUrls: ['./pricing.component.scss'],
  providers: [
    {
      provide: 'lucideIcons',
      useValue: { CheckCircle, HelpCircle, ArrowRight, ShieldCheck, Zap }
    }
  ]
})
export class PricingComponent implements OnInit {
  private seoService = inject(SeoService);

  readonly icons = { CheckCircle, HelpCircle, ArrowRight, ShieldCheck, Zap };

  faqs = [
    {
      question: 'Is Inspectly really free during Early Access?',
      answer: 'Yes! Inspectly is completely free during our Early Access phase. No credit card is required, and there are no monthly limits or contracts. We want solo inspectors to test the platform and give feedback.'
    },
    {
      question: 'What happens when Early Access ends?',
      answer: 'We will introduce simple, transparent, and affordable subscription tiers designed specifically for solo operators. Early adopters will receive grandfathered rates and exclusive benefits as a thank you.'
    },
    {
      question: 'Can I export my templates and reports at any time?',
      answer: 'Absolutely. Your templates, customer details, and generated PDF reports are always yours. You can download and export them whenever you need.'
    },
    {
      question: 'Is there any limit on photos or reports?',
      answer: 'No. You can add as many photos as you need to document findings, and compile unlimited inspection reports during the Early Access period.'
    }
  ];

  ngOnInit() {
    this.seoService.generateTags({
      title: 'Affordable Home Inspection Software | Inspectly Pricing',
      description: 'Explore simple, transparent pricing for solo home inspectors. Inspectly offers native offline-first reporting, rapid template tools, and industry-standard output at an affordable price.',
      url: `${window.location.origin}/pricing`
    });

    // Inject BreadcrumbList Schema
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
          'name': 'Pricing',
          'item': `${window.location.origin}/pricing`
        }
      ]
    }, 'breadcrumb-schema');

    // Inject SoftwareApplication Schema (omitting aggregateRating)
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
