import { Component, inject, OnInit, signal } from '@angular/core';
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
export class LandingComponent implements OnInit {
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

  ngOnInit() {
    this.setSEO();
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
      const response = await fetch('http://localhost:3000/public/beta-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: this.email() })
      });
      
      if (response.ok) {
        this.emailSubmitted.set(true);
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
      const response = await fetch('http://localhost:3000/public/beta-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: this.footerEmail() })
      });
      
      if (response.ok) {
        this.footerEmailSubmitted.set(true);
      }
    } catch (error) {
      console.error('Failed to submit beta request', error);
    } finally {
      this.isFooterSubmitting.set(false);
    }
  }

  goToDashboard() {
    this.router.navigate(['/home']);
  }
}
