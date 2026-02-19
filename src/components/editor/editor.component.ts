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

  private async imageUrlToBase64(url: string): Promise<string> {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error(`Failed to convert image URL to base64: ${url}`, error);
        // Fallback to original URL if conversion fails for any reason (e.g., CORS, network error)
        return url;
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

    // Clone the node to modify it for export without affecting the on-screen preview.
    const contentNode = element.cloneNode(true) as HTMLElement;

    // Remove UI-only elements like drag handles.
    contentNode.querySelectorAll('.drag-handle').forEach(el => el.remove());

    // --- Accurate Image Embedding ---
    // Find all images and convert their URLs to base64 data to ensure they are
    // properly embedded in the final DOCX file, preventing broken image links.
    const images = Array.from(contentNode.querySelectorAll('img'));
    const imagePromises = images.map(async (img) => {
      // Only convert external URLs, not already-base64-encoded (data:...) images.
      if (img.src && img.src.startsWith('http')) {
        img.src = await this.imageUrlToBase64(img.src);
      }
    });

    // Wait for all images to be converted before proceeding.
    await Promise.all(imagePromises);

    // --- Accurate Style Extraction ---
    // Dynamically get all CSS rules from loaded stylesheets for a perfect style match.
    // This is more robust than a hardcoded style string.
    let styles = '';
    const styleSheets = Array.from(document.styleSheets);
    styleSheets.forEach((sheet) => {
      try {
        if (sheet.cssRules) {
          styles += Array.from(sheet.cssRules)
            .map((rule) => rule.cssText)
            .join('\n');
        }
      } catch (e) {
        console.warn('Could not read CSS rules from stylesheet (this is expected for external stylesheets and can be ignored):', sheet.href, e);
      }
    });

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
