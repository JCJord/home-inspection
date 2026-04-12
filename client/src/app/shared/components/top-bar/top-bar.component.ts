import { Component, inject } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { LucideAngularModule, House, ShieldCheck } from 'lucide-angular';

@Component({
  selector: 'app-top-bar',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, TitleCasePipe],
  templateUrl: './top-bar.component.html',
  styleUrl: './top-bar.component.scss'
})
export class TopBarComponent {
  authService = inject(AuthService);
  
  readonly icons = { House, ShieldCheck };
}
