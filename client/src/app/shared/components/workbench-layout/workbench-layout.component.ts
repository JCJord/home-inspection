import { Component, signal, input, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-workbench-layout',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './workbench-layout.component.html',
  styleUrl: './workbench-layout.component.scss'
})
export class WorkbenchLayoutComponent implements AfterViewInit {
  isSidebarOpen = signal<boolean>(false);
  isReady = signal<boolean>(false);

  ngAfterViewInit(): void {
    // Small delay to ensure browser has rendered initial state without transitions
    setTimeout(() => {
      this.isReady.set(true);
    }, 50);
  }

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
