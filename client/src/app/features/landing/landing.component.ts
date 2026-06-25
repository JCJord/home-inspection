import { Component, inject, OnInit, OnDestroy, signal, HostListener, Renderer2 } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { SeoService } from '../../core/services/seo.service';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import {
  LucideAngularModule,
  Zap,
  CloudLightning,
  Shield,
  FileSpreadsheet,
  LayoutTemplate,
  Mail,
  FileCheck,
  ChevronLeft,
  ChevronRight,
  Star,
  Download,
  AlertTriangle,
  Heart,
  CheckCircle,
  XCircle,
  FileText,
  DollarSign,
  Maximize,
  Monitor,
  Camera,
  CreditCard,
  Lock,
  ArrowRight,
  Sparkles,
  Globe,
  ClipboardList,
  Calendar,
  Users,
  Smartphone
} from 'lucide-angular';
import { ImageLightboxComponent } from '../../shared/components/image-lightbox/image-lightbox.component';
import { environment } from '../../../environments/environment';


interface Testimonial {
  quote: string;
  author: string;
  location: string;
  experience: string;
  rating: number;
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ButtonComponent, LucideAngularModule, ImageLightboxComponent],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss'],
  providers: [
    {
      provide: 'lucideIcons',
      useValue: {
        Zap,
        CloudLightning,
        Shield,
        FileSpreadsheet,
        LayoutTemplate,
        Mail,
        FileCheck,
        ChevronLeft,
        ChevronRight,
        Star,
        Download,
        AlertTriangle,
        Heart,
        CheckCircle,
        XCircle,
        FileText,
        DollarSign,
        Maximize,
        Monitor,
        Camera,
        CreditCard,
        Lock,
        ArrowRight,
        Sparkles,
        Globe,
        ClipboardList,
        Calendar,
        Users,
        Smartphone
      }
    }
  ]
})
export class LandingComponent implements OnInit, OnDestroy {


  private seoService = inject(SeoService);
  private router = inject(Router);
  private http = inject(HttpClient);
  authService = inject(AuthService);

  readonly icons = {
    Zap,
    CloudLightning,
    Shield,
    FileSpreadsheet,
    LayoutTemplate,
    Mail,
    FileCheck,
    ChevronLeft,
    ChevronRight,
    Star,
    Download,
    AlertTriangle,
    Heart,
    CheckCircle,
    XCircle,
    FileText,
    DollarSign,
    Maximize,
    Monitor,
    Camera,
    CreditCard,
    Lock,
    ArrowRight,
    Sparkles,
    Globe,
    ClipboardList,
    Calendar,
    Users,
    Smartphone
  };

  activeTab = signal<string>('details');

  readonly showcaseTabs = [
    {
      id: 'details',
      label: 'Inspection Details',
      icon: ClipboardList,
      title: 'Review Everything in One Place',
      description: 'Your inspection dashboard gives you an instant overview. See property details, track section statuses, upload cover photos, and view the executive summary of findings before publishing.'
    },
    {
      id: 'schedule',
      label: 'Schedule & Jobs',
      icon: Calendar,
      title: 'Manage Your Business Operations',
      description: 'Track your calendar, set fees, collect client info, and view all scheduled, draft, or published reports at a glance. It is a full CRM built for solo operators.'
    },
    {
      id: 'workbench',
      label: 'Finding Workbench',
      icon: Zap,
      title: 'Rapid Field Checklist & Finding Form',
      description: 'Log defects on-site in seconds. Navigate sections, select color-coded severities, attach captioned photos, and generate professional descriptions with the AI Assistant.'
    },
    {
      id: 'templates',
      label: 'Template Editor',
      icon: LayoutTemplate,
      title: 'Customize Checklists Without the Bloat',
      description: 'Modify your checklists, set default text, customize locations, and define quick-tap presets in minutes. No complex configuration, no firm-level overhead.'
    }
  ];

  setActiveTab(tabId: string) {
    this.activeTab.set(tabId);
    this.trackEvent(`landing_showcase_tab_${tabId}_click`);
  }



  // Analytics
  private pageEnteredAt = Date.now();
  user: any = null;
  private maxScrollDepth = 0;
  private scrollTracked = new Set<number>();
  private renderer = inject(Renderer2);
  private document = inject(DOCUMENT);

  ngOnInit() {
    this.seoService.generateTags({
      title: 'Inspectly: Fast Offline-First Home Inspection Software for Solo Inspectors',
      description: 'Stop taking work home. Inspectly is the fast, native offline-first home inspection software built for solo inspectors. Create clean reports on-site with zero layout cleanup or formatting errors. Try free.'
    });

    // 1. Organization Schema
    this.seoService.injectSchema({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      'name': 'Inspectly',
      'url': 'https://www.inspectlyhq.com',
      'logo': 'https://www.inspectlyhq.com/assets/icons/inspectly-logo.png',
      'sameAs': [
        'https://twitter.com/inspectlyhq',
        'https://www.linkedin.com/company/inspectlyhq'
      ]
    }, 'org-schema');

    // 2. WebSite Schema with SearchAction
    this.seoService.injectSchema({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      'name': 'Inspectly',
      'url': 'https://www.inspectlyhq.com',
      'potentialAction': {
        '@type': 'SearchAction',
        'target': {
          '@type': 'EntryPoint',
          'urlTemplate': 'https://www.inspectlyhq.com/search?q={search_term_string}'
        },
        'query-input': 'required name=search_term_string'
      }
    }, 'website-schema');

    // 3. SoftwareApplication Schema (omitting aggregateRating)
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

    // 4. FAQ Schema
    this.seoService.injectSchema({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      'mainEntity': [{
        '@type': 'Question',
        'name': 'Is Inspectly offline-first?',
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': 'Yes, Inspectly is built offline-first. You can conduct your entire inspection, take photos, and write narratives without an internet connection. The app will sync automatically when you\'re back online.'
        }
      }, {
        '@type': 'Question',
        'name': 'How long does it take to migrate my templates?',
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': 'Most inspectors can migrate their existing templates in under an hour. We provide intuitive tools to customize sections, items, and defect narratives to match your exact workflow.'
        }
      }, {
        '@type': 'Question',
        'name': 'Is it compatible with mobile?',
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': 'Absolutely. Inspectly is designed specifically for mobile and tablet use on-site, with a clean interface that eliminates the need for \'fat-finger\' corrections or endless scrolling.'
        }
      }, {
        '@type': 'Question',
        'name': 'How much does Inspectly cost?',
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': 'Inspectly is free during our Early Access period. No credit card required, no contracts. When we introduce pricing, early adopters will be grandfathered into the best rate.'
        }
      }, {
        '@type': 'Question',
        'name': 'Is my data safe? Can I export my reports?',
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': 'Yes. Your inspection data is yours. Reports are exported as standard PDFs and can be downloaded at any time. We use industry-standard encryption and never share your data.'
        }
      }]
    }, 'faq-schema');

    // 5. HowTo Schema targeting "how to write inspection reports faster"
    this.seoService.injectSchema({
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      'name': 'How to Write Home Inspection Reports Faster',
      'description': 'Learn the optimal workflow to finish your home inspection reports on-site and save your evenings.',
      'step': [
        {
          '@type': 'HowToStep',
          'position': 1,
          'name': 'Set Up Custom Presets & Checklists',
          'text': 'Before the job, customize your template checklists with color-coded severity controls and default observation presets.'
        },
        {
          '@type': 'HowToStep',
          'position': 2,
          'name': 'Record Findings Offline in the Field',
          'text': 'Inspect without internet connection. Log defects instantly and capture photos as you work on-site.'
        },
        {
          '@type': 'HowToStep',
          'position': 3,
          'name': 'Use AI to Write Defect Narratives',
          'text': 'Use the built-in AI Assistant to translate shorthand field notes into professional, polished observations.'
        },
        {
          '@type': 'HowToStep',
          'position': 4,
          'name': 'Export and Deliver the PDF Immediately',
          'text': 'Verify the executive summary and export a clean PDF report immediately after inspection with zero nightly cleanup.'
        }
      ]
    }, 'howto-schema');
  }

  ngOnDestroy() {
  }

  @HostListener('window:scroll')
  onScroll() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight <= 0) return;
    const depth = Math.round((scrollTop / docHeight) * 100);
    this.maxScrollDepth = Math.max(this.maxScrollDepth, depth);

    for (const milestone of [25, 50, 75, 100]) {
      if (depth >= milestone && !this.scrollTracked.has(milestone)) {
        this.scrollTracked.add(milestone);
      }
    }
  }

  // Carousel State
  imageBaseUrl = 'https://pub-4a444b708e4e4f4f9a88a53b374f4c00.r2.dev/'; // Replace with correct R2 domain if needed
  reportPages = [
    { file: '11.jpg', alt: 'Clean Home Inspection Cover Page Example' },
    { file: '13.jpg', alt: 'Professional Home Inspection Summary Page' },
    { file: '14.jpg', alt: 'Clean Home Inspection Summary Page Example' },
    { file: '15.jpg', alt: 'Professional Defect Narrative Report Format' },
    { file: '113.jpg', alt: 'Home Inspection Report Roof Findings' },
    { file: '114.jpg', alt: 'Exterior Inspection Report Template Example' },
    { file: '115.jpg', alt: 'Electrical Panel Inspection Reporting Format' },
    { file: '116.jpg', alt: 'Plumbing System Inspection Findings Page' },
    { file: '117.jpg', alt: 'HVAC Inspection Report Template Example' },
    { file: '118.jpg', alt: 'Interior Inspection Report Findings Page' }
  ];

  isLightboxOpen = signal<boolean>(false);
  currentLightboxIndex = signal<number>(0);

  get fullImageUrls() {
    return this.reportPages.map(page => ({
      url: `${this.imageBaseUrl}${page.file}`,
      alt: page.alt
    }));
  }

  openLightbox(index: number) {
    this.currentLightboxIndex.set(index);
    this.isLightboxOpen.set(true);
    this.trackEvent('landing_lightbox_opened');
  }

  closeLightbox() {
    this.isLightboxOpen.set(false);
  }

  goToDashboard() {
    this.router.navigate(['/home']);
  }

  trackEvent(eventName: string) {
    if ((window as any).gtag) {
      (window as any).gtag('event', eventName);
    }
  }
}
