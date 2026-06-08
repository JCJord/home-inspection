import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Title, Meta } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { LucideAngularModule, ArrowLeft } from 'lucide-angular';

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
  private titleService = inject(Title);
  private metaService = inject(Meta);

  ngOnInit() {
    this.titleService.setTitle('Terms of Service | Inspectly');
    this.metaService.updateTag({ name: 'description', content: 'Inspectly Terms of Service' });
  }
}
