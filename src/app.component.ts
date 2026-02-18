
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { EditorComponent } from './components/editor/editor.component';
import { PreviewComponent } from './components/preview/preview.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EditorComponent, PreviewComponent],
})
export class AppComponent {}
