import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Title, Meta } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { LucideAngularModule, CheckCircle, XCircle, Zap, Shield, ChevronRight } from 'lucide-angular';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { track } from '@vercel/analytics';

@Component({
  selector: 'app-alternative-to-spectora',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule, ButtonComponent],
  templateUrl: './alternative-to-spectora.component.html',
})
export class AlternativeToSpectoraComponent implements OnInit {
  private titleService = inject(Title);
  private metaService = inject(Meta);

  readonly icons = { CheckCircle, XCircle, Zap, Shield, ChevronRight };

  ngOnInit() {
    this.titleService.setTitle('Best Spectora Alternative for Solo Home Inspectors | Inspectly');
    this.metaService.updateTag({ 
      name: 'description', 
      content: 'Looking for an alternative to Spectora? Discover why solo home inspectors are switching to Inspectly for a faster, offline-first, and more affordable reporting solution.' 
    });
    track('page_view_spectora_alternative');
  }

  trackEvent(eventName: string) {
    track(eventName);
    if ((window as any).gtag) {
      (window as any).gtag('event', eventName);
    }
  }
}
