import { Component, ChangeDetectionStrategy, inject, signal, ElementRef, ViewChild, OnInit, AfterViewInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { LetterService } from '../../services/letter.service';
import { GeminiService } from '../../services/gemini.service';
import { OfferLetterData } from '../../models/letter.model';
import { UiService } from '../../services/ui.service';

// This is a global declaration for libraries loaded via CDN
declare const html2pdf: any;

type TemplateType = 'classic' | 'modern' | 'creative' | 'regal' | 'vibrant' | 'formal' | 'tech' | 'corporate';

@Component({
  selector: 'app-editor',
  templateUrl: './editor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule],
})
export class EditorComponent implements OnInit, AfterViewInit {
  private fb = inject(FormBuilder);
  letterService = inject(LetterService);
  geminiService = inject(GeminiService);
  uiService = inject(UiService);

  @ViewChild('editorDiv') editorDiv?: ElementRef<HTMLDivElement>;

  activeTab = signal<'details' | 'style' | 'ai' | 'export'>('details');
  compensationType = signal<'salary' | 'perks'>('salary');
  aiPrompt = signal('Generate an offer letter for a Senior Product Manager named Sarah Lee, starting September 1st, with an annual salary of $150,000.');
  aiLoading = signal(false);
  aiError = signal<string | null>(null);
  logoError = signal<string | null>(null);
  signatureError = signal<string | null>(null);
  isRewriting = signal(false);

  form = this.fb.group({
    companyName: ['', Validators.required],
    companyAddress: [''],
    companyLogo: [null as string | null],
    companyEmail: [''],
    companyPhone: [''],
    companyWebsite: [''],
    companyLinkedIn: [''],
    candidateName: ['', Validators.required],
    candidateAddress: [''],
    date: ['', Validators.required],
    jobTitle: ['', Validators.required],
    startDate: ['', Validators.required],
    salary: [null as number | null, [Validators.required, Validators.min(0)]],
    salaryFrequency: ['annually' as const, Validators.required],
    perksAndBenefits: [''],
    managerName: [''],
    offerType: ['Full-Time Employment' as const, Validators.required],
    body: ['', Validators.required],
    acceptanceDeadline: ['', Validators.required],
    signerName: ['', Validators.required],
    signerTitle: ['', Validators.required],
    signerSignature: [null as string | null],
    template: ['classic' as TemplateType, Validators.required],
    fontFamily: ['Merriweather', Validators.required],
    headingColor: ['#1D1D1D', Validators.required],
    bodyColor: ['#1D1D1D', Validators.required],
    accentColor: ['#2D3C77', Validators.required],
    logoAlignment: ['right' as 'left' | 'right', Validators.required],
    elementOrder: [['header', 'date', 'subject', 'body', 'signature']],
  });

  constructor() {
    // Sync form with service state on init
    const initialData = this.letterService.letterData();
    this.form.patchValue(initialData, { emitEvent: false });
    this.compensationType.set((initialData.salary && initialData.salary > 0) ? 'salary' : 'perks');
    this.updateCompensationValidators();


    // Sync form changes back to service for all fields.
    // The `body` control updates are silent from user input, so this only
    // fires for other controls or programmatic changes.
    this.form.valueChanges.subscribe(value => {
      this.letterService.updateLetterData(value as Partial<OfferLetterData>);
    });
  }
  
  ngOnInit(): void {
    // Sync programmatic changes to the 'body' form control back to the editor's HTML.
    // This is for changes from the AI Assistant, etc., not user input.
    this.form.get('body')?.valueChanges.subscribe(value => {
      if (this.editorDiv && this.editorDiv.nativeElement.innerHTML !== value) {
        this.editorDiv.nativeElement.innerHTML = value ?? '';
      }
    });
  }

  ngAfterViewInit(): void {
    // Set the initial content of the editor once the view is ready.
    if (this.editorDiv) {
      this.editorDiv.nativeElement.innerHTML = this.form.get('body')?.value ?? '';
    }
  }

  setCompensationType(type: 'salary' | 'perks'): void {
    this.compensationType.set(type);
    this.updateCompensationValidators();
  }

  private updateCompensationValidators(): void {
    const salaryControl = this.form.get('salary');
    const salaryFrequencyControl = this.form.get('salaryFrequency');
    const perksControl = this.form.get('perksAndBenefits');

    if (this.compensationType() === 'salary') {
      salaryControl?.setValidators([Validators.required, Validators.min(0)]);
      salaryFrequencyControl?.setValidators([Validators.required]);
      perksControl?.setValidators(null);
      perksControl?.setValue('');
    } else {
      salaryControl?.setValidators(null);
      salaryFrequencyControl?.setValidators(null);
      perksControl?.setValidators([Validators.required]);
      salaryControl?.setValue(null);
    }
    salaryControl?.updateValueAndValidity({ emitEvent: false });
    salaryFrequencyControl?.updateValueAndValidity({ emitEvent: false });
    perksControl?.updateValueAndValidity({ emitEvent: false });
  }

  onLogoUpload(event: Event): void {
    this.handleImageUpload(event, 'companyLogo', this.logoError);
  }

  onSignatureUpload(event: Event): void {
    this.handleImageUpload(event, 'signerSignature', this.signatureError);
  }

  private handleImageUpload(event: Event, formControlName: string, errorSignal: any): void {
     const input = event.target as HTMLInputElement;
    errorSignal.set(null);

    if (input.files && input.files[0]) {
      const file = input.files[0];
      const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml'];
      if (!allowedTypes.includes(file.type)) {
        errorSignal.set('Invalid file type. Please use PNG, JPEG, GIF, or SVG.');
        input.value = '';
        return;
      }

      const maxSizeInMB = 2;
      const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
      if (file.size > maxSizeInBytes) {
        errorSignal.set(`File is too large. Maximum size is ${maxSizeInMB}MB.`);
        input.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        this.form.patchValue({ [formControlName]: reader.result as string });
      };
      reader.onerror = () => {
        errorSignal.set('An error occurred while reading the file.');
      };
      reader.readAsDataURL(file);
    }
  }


  generateLogo(): void {
    const logoUrl = `https://picsum.photos/200/200?random=${Math.random()}`;
    this.form.patchValue({ companyLogo: logoUrl });
    this.logoError.set(null); // Clear any previous errors
  }

  removeLogo(): void {
    this.form.patchValue({ companyLogo: null });
    this.logoError.set(null);
  }

  removeSignature(): void {
    this.form.patchValue({ signerSignature: null });
    this.signatureError.set(null);
  }

  async generateWithAI(): Promise<void> {
    this.aiLoading.set(true);
    this.aiError.set(null);
    try {
      const generatedData = await this.geminiService.generateLetter(this.aiPrompt());
      this.form.patchValue(generatedData);
       if (generatedData.salary && generatedData.salary > 0) {
        this.compensationType.set('salary');
      } else {
        this.compensationType.set('perks');
      }
      this.updateCompensationValidators();
      this.activeTab.set('details'); // Switch back to details tab after generation
    } catch (error) {
      this.aiError.set(error instanceof Error ? error.message : 'An unknown error occurred.');
    } finally {
      this.aiLoading.set(false);
    }
  }

  // --- Rich Text Editor Methods ---

  onBodyInput(event: Event): void {
    const value = (event.target as HTMLElement).innerHTML;
    // Silently update the form model to prevent cursor jumps.
    this.form.get('body')?.setValue(value, { emitEvent: false });
    // Manually update the service to ensure the preview is synced in real-time.
    this.letterService.updateLetterData({ body: value });
  }

  formatDoc(command: string): void {
    document.execCommand(command, false);
    this.editorDiv?.nativeElement.focus();
  }

  async rewriteSelection(): Promise<void> {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const selectedText = range.toString();

    if (!selectedText.trim()) return;

    this.isRewriting.set(true);
    try {
      const rewrittenText = await this.geminiService.rewriteText(selectedText);
      
      // Ensure the editor is focused before executing a command
      this.editorDiv?.nativeElement.focus();
      
      // Restore selection if focus was lost
      selection.removeAllRanges();
      selection.addRange(range);

      document.execCommand('insertHTML', false, rewrittenText);
      
      // Update form value after modification
      this.onBodyInput({ target: this.editorDiv?.nativeElement } as any);

    } catch (error) {
      console.error("Failed to rewrite text", error);
      // Optionally, show an error to the user
    } finally {
      this.isRewriting.set(false);
    }
  }

  exportToPdf(): void {
    const element = document.getElementById('letter-preview-content');
    if (element) {
      const opt = {
        margin: [0.5, 0.5, 0.5, 0.5],
        filename: `${this.form.value.candidateName}_Offer_Letter.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
      };
      html2pdf().from(element).set(opt).save();
    }
  }
  
  async exportToDocx(): Promise<void> {
    const element = document.getElementById('letter-preview-content');
    const htmlToDocxLib = (window as any).htmlToDocx;

    if (!element) {
      console.error('Preview element for DOCX export not found.');
      return;
    }

    if (typeof htmlToDocxLib !== 'function') {
      console.error('html-to-docx library is not loaded or not available on the window object.');
      alert('Error: The DOCX export library could not be found. Please check your internet connection and try again.');
      return;
    }

    const styles = `
      body { font-family: 'Inter', sans-serif; box-sizing: border-box; }
      .letter-preview {
          color: var(--custom-body-color, #1D1D1D);
      }
      :root {
          --color-green: #07F57B;
          --color-blue: #2D3C77;
          --color-black: #1D1D1D;
          --color-yellow: #FCD202;
          --color-ceramic: #A6C5E2;
      }
      .template-modern .letter-header {
          border-left: 8px solid var(--custom-accent-color, var(--color-blue));
          padding-left: 2rem; padding-top: 1rem; padding-bottom: 1rem;
          display: flex; justify-content: space-between; align-items: flex-start;
          margin-bottom: 3rem; background-color: #f0f5fa;
      }
      .template-modern .letter-header h2 { color: var(--custom-heading-color, var(--color-blue)); font-size: 2.25rem; }
      .template-modern h3 { color: var(--custom-heading-color, var(--color-blue)); }
      .template-modern .letter-signature { border-top: 2px solid var(--custom-accent-color, var(--color-blue)); padding-top: 1rem; }

      .template-creative .letter-header {
          position: relative; background-color: var(--custom-accent-color, var(--color-black));
          color: white; padding: 2.5rem; margin-bottom: 3rem; border-radius: 0.5rem;
      }
      .template-creative .letter-header h2 { color: var(--color-green); font-size: 2rem; font-weight: 700; }
      .template-creative .letter-header p { color: var(--color-ceramic); }
      .template-creative h3 {
          color: var(--custom-heading-color, var(--color-black));
          border-bottom: 3px solid var(--custom-accent-color, var(--color-yellow));
          padding-bottom: 0.5rem; display: inline-block;
      }
      .template-creative .letter-signature { border-top: 2px solid var(--custom-accent-color, var(--color-green)); padding-top: 1rem; }

      .template-regal .letter-header {
          background-color: var(--custom-accent-color, var(--color-blue)); color: white;
          padding: 2rem; margin: 0 0 3rem 0; border-bottom: 4px solid var(--color-yellow);
      }
      .template-regal .letter-header h2 { color: var(--custom-heading-color, white); }
      .template-regal .letter-header p { color: var(--color-ceramic); }
      .template-regal h3 { color: var(--custom-heading-color, var(--color-blue)); font-weight: 700; }
      .template-regal .letter-signature { border-top: 1px solid var(--color-ceramic); margin-top: 2rem; padding-top: 1rem; }

      .template-vibrant { position: relative; }
      .template-vibrant .letter-header { border-top: 8px solid var(--custom-accent-color, var(--color-green)); padding-top: 1.5rem; }
      .template-vibrant .letter-header h2 { color: var(--custom-heading-color, var(--color-black)); font-size: 2.5rem; }
      .template-vibrant h3 { color: var(--custom-heading-color, var(--color-black)); }
      .template-vibrant .letter-signature { border-top: 2px solid var(--custom-accent-color, var(--color-black)); padding-top: 1rem; }

      .template-formal { display: flex; flex-direction: column; position: relative; }
      .template-formal .letter-header h3 { color: var(--custom-heading-color, var(--color-black)); }
      .template-formal .letter-body { flex-grow: 1; }
      .template-formal .letter-signature { border: none; padding-top: 0; }
      .template-formal .formal-footer {
          padding-top: 1.5rem; border-top: 1px solid #e5e7eb;
          display: flex; justify-content: space-between; align-items: flex-end;
      }
      .template-formal .formal-footer-contact { display: flex; flex-wrap: wrap; gap: 1.5rem; }
      .template-formal .formal-footer-item { display: flex; align-items: center; gap: 0.5rem; }
      .template-formal .formal-footer-item svg { width: 1.25rem; height: 1.25rem; color: var(--custom-accent-color, var(--color-black)); flex-shrink: 0; }
      .template-formal .formal-footer-item div { font-size: 0.8rem; font-family: 'Inter', sans-serif; }
      .template-formal .formal-footer-item strong { display: block; font-weight: 600; color: #333; }

      .template-tech { display: flex; padding: 0; }
      .template-tech .tech-sidebar {
          background-color: var(--custom-accent-color, var(--color-blue)); color: white; width: 250px;
          padding: 2.5rem; display: flex; flex-direction: column; align-items: center; text-align: center;
      }
      .template-tech .tech-sidebar .company-logo {
          max-width: 120px; max-height: 120px; background-color: white;
          border-radius: 0.5rem; padding: 0.5rem; margin-bottom: 1rem;
      }
      .template-tech .tech-sidebar .company-name { font-size: 1.5rem; font-weight: 700; color: white; }
      .template-tech .tech-content { flex-grow: 1; padding: 3rem; }
      .template-tech .tech-content h3 { color: var(--color-green); }
      .template-tech .tech-content .letter-signature { border-top: 2px solid var(--color-green); margin-top: 2rem; padding-top: 1rem; }

      .template-corporate { padding: 0; }
      .template-corporate .corporate-header {
          background-color: var(--custom-accent-color, var(--color-black)); color: white;
          padding: 2rem 3rem; text-align: center; border-bottom: 5px solid var(--color-yellow);
      }
      .template-corporate .corporate-header .company-name { font-size: 2.5rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
      .template-corporate .corporate-content { padding: 3rem; }
      .template-corporate .corporate-content h3 {
          text-transform: uppercase; letter-spacing: 0.05em; color: var(--custom-heading-color, var(--color-black));
          border-bottom: 1px solid var(--color-ceramic); padding-bottom: 0.5rem;
      }
      .template-corporate .letter-signature { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid var(--color-ceramic); }
      .template-corporate .corporate-footer {
          background-color: #f8f9fa; padding: 1.5rem 3rem; border-top: 1px solid #e5e7eb;
          text-align: center; font-size: 0.8rem; color: #6c757d;
      }
      /* Generic helpers that might be used across templates */
      .flex { display: flex; }
      .justify-between { justify-content: space-between; }
      .items-start { align-items: flex-start; }
      .text-right { text-align: right; }
      .mb-12 { margin-bottom: 3rem; }
      .text-2xl { font-size: 1.5rem; }
      .font-bold { font-weight: 700; }
      .text-gray-900 { color: #111827; }
      .whitespace-pre-line { white-space: pre-line; }
    `;

    // Cloned node to avoid showing removed elements in the preview
    const contentNode = element.cloneNode(true) as HTMLElement;
    // Remove drag handles from cloned node before export
    contentNode.querySelectorAll('.drag-handle').forEach(el => el.remove());

    const htmlString = `<!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <style>${styles}</style>
        </head>
        <body>${contentNode.outerHTML}</body>
      </html>`;

    const fileBuffer = await htmlToDocxLib(htmlString, null, {
      table: { row: { cantSplit: true } },
      footer: true,
      pageNumber: true,
    });

    const blob = new Blob([fileBuffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${this.form.value.candidateName || 'Candidate'}_Offer_Letter.docx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }
}
