
import { Component, ChangeDetectionStrategy, inject, signal, effect } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { LetterService } from '../../services/letter.service';
import { GeminiService } from '../../services/gemini.service';
import { OfferLetterData } from '../../models/letter.model';

// This is a global declaration for libraries loaded via CDN
declare const html2pdf: any;
declare const htmlToDocx: any;

type TemplateType = 'classic' | 'modern' | 'creative' | 'regal' | 'vibrant' | 'formal';

@Component({
  selector: 'app-editor',
  templateUrl: './editor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule],
})
export class EditorComponent {
  private fb = inject(FormBuilder);
  letterService = inject(LetterService);
  geminiService = inject(GeminiService);

  activeTab = signal<'details' | 'style' | 'customize' | 'ai' | 'export'>('details');
  compensationType = signal<'salary' | 'perks'>('salary');
  aiPrompt = signal('Generate an offer letter for a Senior Product Manager named Sarah Lee, starting September 1st, with an annual salary of $150,000.');
  aiLoading = signal(false);
  aiError = signal<string | null>(null);
  logoError = signal<string | null>(null);
  signatureError = signal<string | null>(null);

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
  });

  constructor() {
    // Sync form with service state on init
    const initialData = this.letterService.letterData();
    this.form.patchValue(initialData, { emitEvent: false });
    this.compensationType.set((initialData.salary && initialData.salary > 0) ? 'salary' : 'perks');
    this.updateCompensationValidators();


    // Sync form changes back to service
    this.form.valueChanges.subscribe(value => {
      this.letterService.updateLetterData(value as Partial<OfferLetterData>);
    });
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
    if(element) {
      const htmlString = `<!DOCTYPE html>
        <html lang="en">
          <head><meta charset="UTF-8"></head>
          <body>${element.innerHTML}</body>
        </html>`;

      const fileBuffer = await htmlToDocx(htmlString, null, {
        table: { row: { cantSplit: true } },
        footer: true,
        pageNumber: true,
      });

      const blob = new Blob([fileBuffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${this.form.value.candidateName}_Offer_Letter.docx`;
      link.click();
      URL.revokeObjectURL(link.href);
    }
  }
}
