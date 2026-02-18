import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LetterService } from '../../services/letter.service';
import { UiService } from '../../services/ui.service';
import { CdkDragDrop, moveItemInArray, DragDropModule } from '@angular/cdk/drag-drop';
import { SafeHtmlPipe } from '../../pipes/safe-html.pipe';

@Component({
  selector: 'app-preview',
  templateUrl: './preview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DragDropModule, SafeHtmlPipe],
})
export class PreviewComponent {
  letterService = inject(LetterService);
  uiService = inject(UiService);
  letterData = this.letterService.letterData;
  formattedBody = computed(() => this.letterService.getFormattedBody());

  private draggableTemplates = ['classic', 'modern', 'creative', 'regal', 'vibrant'];

  isArrangeModeActive = computed(() => {
    return this.uiService.isArrangeMode() && this.draggableTemplates.includes(this.letterData().template);
  });

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  drop(event: CdkDragDrop<string[]>) {
    const data = this.letterData();
    const newOrder = [...data.elementOrder];
    moveItemInArray(newOrder, event.previousIndex, event.currentIndex);
    this.letterService.updateLetterData({ elementOrder: newOrder });
  }
}
