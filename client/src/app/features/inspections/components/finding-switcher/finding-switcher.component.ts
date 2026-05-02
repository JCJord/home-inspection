import { Component, signal, input, output, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, ChevronLeft, ChevronRight, ChevronDown, Plus } from 'lucide-angular';
import { Finding } from '../../../../core/models/inspection.interface';
import { ButtonComponent } from '../../../../shared/components/button/button.component';

@Component({
  selector: 'app-finding-switcher',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, ButtonComponent],
  providers: [
    {
      provide: 'lucideIcons',
      useValue: { ChevronLeft, ChevronRight, ChevronDown, Plus }
    }
  ],
  templateUrl: './finding-switcher.component.html',
  styleUrl: './finding-switcher.component.scss',
})
export class FindingSwitcherComponent {
  finding = input<Finding | null>(null);
  sectionFindings = input<Finding[]>([]);
  
  findingSelected = output<Finding | null>();
  
  currentIndex = signal<number>(0);

  readonly icons = {
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    Plus
  };

  constructor() {
    effect(() => {
      const findings = this.sectionFindings();
      const current = this.finding();
      
      if (!current || findings.length === 0) {
        this.currentIndex.set(0);
      } else {
        const index = findings.findIndex(f => f.id === current.id);
        this.currentIndex.set(index >= 0 ? index : 0);
      }
    }, { allowSignalWrites: true });
  }

  getFindingLabel(finding: Finding | null): string {
    if (!finding) return 'New Finding';
    let snippet = finding.short_note || 'Drafting note...';
    if (snippet.length > 25) {
      snippet = snippet.substring(0, 22) + '...';
    }
    return finding.location ? `${finding.location} - ${snippet}` : snippet;
  }

  goToNextFinding() {
    const findings = this.sectionFindings();
    const nextIndex = this.currentIndex() + 1;
    if (nextIndex < findings.length) {
      this.findingSelected.emit(findings[nextIndex]);
    }
  }

  goToPreviousFinding() {
    const findings = this.sectionFindings();
    const prevIndex = this.currentIndex() - 1;
    if (prevIndex >= 0) {
      this.findingSelected.emit(findings[prevIndex]);
    }
  }

  startNewFinding() {
    this.findingSelected.emit(null);
  }

  selectFindingById(id: string) {
    if (id === 'new') {
      this.startNewFinding();
    } else {
      const found = this.sectionFindings().find(f => f.id === id);
      if (found) {
        this.findingSelected.emit(found);
      }
    }
  }
}
