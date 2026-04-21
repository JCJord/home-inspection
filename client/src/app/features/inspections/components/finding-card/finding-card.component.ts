import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Finding } from '../../../../core/models/inspection.interface';
import { LucideAngularModule, MapPin } from 'lucide-angular';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-finding-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './finding-card.component.html',
  styleUrl: './finding-card.component.scss',
})
export class FindingCardComponent {
  finding = input.required<Finding>();

  readonly icons = { MapPin };

  resolveImageUrl(url: string | undefined): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const path = url.startsWith('/') ? url : `/${url}`;
    return `${environment.apiUrl}${path}`;
  }
}
