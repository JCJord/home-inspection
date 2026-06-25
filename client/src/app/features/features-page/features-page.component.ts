import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule, Smartphone, CloudLightning, Shield, LayoutTemplate, Edit3, ArrowRight, Zap, Check } from 'lucide-angular';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { SeoService } from '../../core/services/seo.service';


@Component({
  selector: 'app-features-page',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule, ButtonComponent],
  templateUrl: './features-page.component.html',
  styleUrls: ['./features-page.component.scss'],
  providers: [
    {
      provide: 'lucideIcons',
      useValue: { Smartphone, CloudLightning, Shield, LayoutTemplate, Edit3, ArrowRight, Zap, Check }
    }
  ]
})
export class FeaturesPageComponent implements OnInit {
  private seoService = inject(SeoService);

  readonly icons = { Smartphone, CloudLightning, Shield, LayoutTemplate, Edit3, ArrowRight, Zap, Check };

  ngOnInit() {
    this.seoService.generateTags({
      title: 'Fast Offline-First Features | Inspectly Home Inspection App',
      description: 'Explore Inspectly\'s premium reporting features. Built offline-first with zero lag, instant PDF generation on-site, and a simple custom template editor.',
      url: `${window.location.origin}/features`
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
          'name': 'Features',
          'item': `${window.location.origin}/features`
        }
      ]
    }, 'breadcrumb-schema');

    // HowTo Schema targeting "how to create a home inspection template"
    this.seoService.injectSchema({
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      'name': 'How to Create a Custom Home Inspection Template in Inspectly',
      'description': 'Configure a lightweight, professional checklist template for your home inspections in minutes with no code setup.',
      'step': [
        {
          '@type': 'HowToStep',
          'position': 1,
          'name': 'Access the Template Editor',
          'text': 'Log into your Inspectly dashboard, navigate to the Templates tab, and click Create Template.'
        },
        {
          '@type': 'HowToStep',
          'position': 2,
          'name': 'Define Categories and Sections',
          'text': 'Create high-level sections such as Roofing, Exterior, Electrical, and HVAC. Add subsections representing inspectable items.'
        },
        {
          '@type': 'HowToStep',
          'position': 3,
          'name': 'Add Default Descriptions & Quick Presets',
          'text': 'Write standard observation templates and set severity rankings to reduce custom typing in the field.'
        },
        {
          '@type': 'HowToStep',
          'position': 4,
          'name': 'Save and Sync',
          'text': 'Save your new template. It will automatically sync to your mobile device for offline inspection use.'
        }
      ]
    }, 'howto-schema');

  }

  trackEvent(eventName: string) {
    if ((window as any).gtag) {
      (window as any).gtag('event', eventName);
    }
  }
}
