import { Component, inject, OnInit, OnDestroy, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '../../shared/components/button/button.component';
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
  FileText,
  DollarSign
} from 'lucide-angular';
import { environment } from '../../../environments/environment';
import { inject as injectAnalytics, track } from '@vercel/analytics';

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
  imports: [CommonModule, FormsModule, RouterModule, ButtonComponent, LucideAngularModule],
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
        FileText,
        DollarSign
      }
    }
  ]
})
export class LandingComponent implements OnInit, OnDestroy {
  constructor() {
    injectAnalytics();
  }

  private titleService = inject(Title);
  private metaService = inject(Meta);
  private router = inject(Router);
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
    FileText,
    DollarSign
  };

  // Email capture state
  email = signal<string>('');
  emailSubmitted = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);

  footerEmail = signal<string>('');
  footerEmailSubmitted = signal<boolean>(false);
  isFooterSubmitting = signal<boolean>(false);

  // Analytics
  private pageEnteredAt = Date.now();
  private maxScrollDepth = 0;
  private scrollTracked = new Set<number>();

  ngOnInit() {
    this.setSEO();
  }

  ngOnDestroy() {
    const timeSpent = Math.round((Date.now() - this.pageEnteredAt) / 1000);
    track('landing_session', {
      duration_seconds: timeSpent,
      max_scroll_depth: this.maxScrollDepth
    });
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
        track('landing_scroll', { depth_percent: milestone });
      }
    }
  }

  private setSEO() {
    this.titleService.setTitle('Home Inspection Report Software for Solo Inspectors | Inspectly');
    
    // Core SEO tags
    this.metaService.updateTag({ 
      name: 'description', 
      content: 'Inspectly is home inspection report software built for solo inspectors. Generate clean PDF reports on-site, work offline, and stop overpaying for Spectora.' 
    });
    this.metaService.updateTag({ name: 'robots', content: 'index, follow' });

    // Open Graph Tags for sharing
    this.metaService.updateTag({ property: 'og:title', content: 'Home Inspection Report Software for Solo Inspectors | Inspectly' });
    this.metaService.updateTag({ property: 'og:description', content: 'Inspectly is home inspection report software built for solo inspectors. Generate clean PDF reports on-site, work offline, and stop overpaying for Spectora.' });
    this.metaService.updateTag({ property: 'og:type', content: 'website' });
    this.metaService.updateTag({ property: 'og:url', content: window.location.origin });
    this.metaService.updateTag({ property: 'og:image', content: `${window.location.origin}/assets/images/og-image.jpg` });
  }

  async submitBetaRequest(event: Event) {
    event.preventDefault();
    if (!this.email().trim()) return;

    this.isSubmitting.set(true);
    try {
      const response = await fetch(`${environment.apiUrl}/public/beta-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: this.email() })
      });
      
      if (response.ok) {
        this.emailSubmitted.set(true);
        track('landing_cta_submit', { location: 'hero', email: this.email() });
      }
    } catch (error) {
      console.error('Failed to submit beta request', error);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async submitFooterBetaRequest(event: Event) {
    event.preventDefault();
    if (!this.footerEmail().trim()) return;

    this.isFooterSubmitting.set(true);
    try {
      const response = await fetch(`${environment.apiUrl}/public/beta-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: this.footerEmail() })
      });
      
      if (response.ok) {
        this.footerEmailSubmitted.set(true);
        track('landing_cta_submit', { location: 'footer', email: this.footerEmail() });
      }
    } catch (error) {
      console.error('Failed to submit beta request', error);
    } finally {
      this.isFooterSubmitting.set(false);
    }
  }

  goToDashboard() {
    track('landing_go_to_dashboard');
    this.router.navigate(['/home']);
  }

  onSamplePdfClick() {
    track('landing_sample_pdf_click');
  }

  onLiveReportClick() {
    track('landing_demo_live_report_click');
    if ((window as any).gtag) {
      (window as any).gtag('event', 'click_live_report_demo');
    }
  }

  onPdfReportClick() {
    track('landing_demo_pdf_report_click');
    if ((window as any).gtag) {
      (window as any).gtag('event', 'click_pdf_report_demo');
    }
  }
}
