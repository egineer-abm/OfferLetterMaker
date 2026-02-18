
import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LetterService } from '../../services/letter.service';

@Component({
  selector: 'app-preview',
  templateUrl: './preview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
})
export class PreviewComponent {
  letterService = inject(LetterService);
  letterData = this.letterService.letterData;
  formattedBody = computed(() => this.letterService.getFormattedBody());

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}
