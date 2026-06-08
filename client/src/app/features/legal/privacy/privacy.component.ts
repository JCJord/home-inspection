import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Title, Meta } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { LucideAngularModule, ArrowLeft } from 'lucide-angular';

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
  private titleService = inject(Title);
  private metaService = inject(Meta);

  ngOnInit() {
    this.titleService.setTitle('Privacy Policy | Inspectly');
    this.metaService.updateTag({ name: 'description', content: 'Inspectly Privacy Policy' });
  }
}
