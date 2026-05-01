import { Component, signal, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-workbench-layout',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './workbench-layout.component.html',
  styleUrl: './workbench-layout.component.scss'
})
export class WorkbenchLayoutComponent {
  isSidebarOpen = signal<boolean>(false);

  toggleSidebar(): void {
    this.isSidebarOpen.set(!this.isSidebarOpen());
  }

  closeSidebar(): void {
    this.isSidebarOpen.set(false);
  }

  openSidebar(): void {
    this.isSidebarOpen.set(true);
  }
}
