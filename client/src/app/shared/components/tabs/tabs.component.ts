import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

export interface TabItem {
  label: string;
  link: string;
  icon?: any;
}

@Component({
  selector: 'app-tabs',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, LucideAngularModule],
  templateUrl: './tabs.component.html',
  styleUrl: './tabs.component.scss'
})
export class TabsComponent {
  /**
   * The array of tab items to display.
   * @required
   */
  items = input.required<TabItem[]>();

  /**
   * Optional size for icons.
   * @default 18
   */
  iconSize = input<number>(18);
}
