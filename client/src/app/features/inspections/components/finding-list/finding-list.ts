import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Finding } from '../../../../core/models/inspection.interface';
import { LucideAngularModule, Plus, Trash2, Check, X } from 'lucide-angular';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { ConfirmPillComponent } from '../../../../shared/components/confirm-pill/confirm-pill.component';

@Component({
  selector: 'app-finding-list',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, ButtonComponent, ConfirmPillComponent],
  providers: [
    {
      provide: 'lucideIcons',
      useValue: { Plus, Trash2, Check, X }
    }
  ],
  templateUrl: './finding-list.html',
  styleUrl: './finding-list.scss'
})
export class FindingListComponent {
  findings = input<Finding[]>([]);
  selectedFindingId = input<string | null>(null);
  disabled = input<boolean>(false);
  
  findingSelected = output<Finding>();
  addFindingTriggered = output<void>();
  deleteFindingTriggered = output<Finding>();

  confirmDeleteId = signal<string | null>(null);

  readonly icons = { Plus, Trash2, Check, X };

  getFindingLabel(finding: Finding): string {
    let snippet = finding.description || 'New Finding';
    if (snippet.length > 35) {
      snippet = snippet.substring(0, 32) + '...';
    }
    return finding.location ? `${finding.location} - ${snippet}` : snippet;
  }

  initDelete(finding: Finding, event: Event) {
    event.stopPropagation();
    this.confirmDeleteId.set(finding.id);
  }

  confirmDelete(finding: Finding) {
    this.deleteFindingTriggered.emit(finding);
    this.confirmDeleteId.set(null);
  }

  cancelDelete() {
    this.confirmDeleteId.set(null);
  }
}
