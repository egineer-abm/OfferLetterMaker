
import { Injectable, signal } from '@angular/core';
import { OfferLetterData } from '../models/letter.model';

@Injectable({ providedIn: 'root' })
export class LetterService {
  private defaultBody = `We are delighted to offer you the position of {jobTitle} at {companyName}. We were impressed with your qualifications and experience, and we believe you will be a valuable asset to our team.

This is a {offerType} position, starting on {startDate}. You will report to {managerName}. {compensationDetails}

Please review the attached documents for more details about your compensation, benefits, and the terms of your employment.

To accept this offer, please sign and return this letter by {acceptanceDeadline}.

We look forward to welcoming you to the team.

Sincerely,`;

  private initialState: OfferLetterData = {
    companyName: 'Innovate Inc.',
    companyAddress: '123 Tech Avenue, Silicon Valley, CA 94000',
    companyLogo: null,
    companyEmail: 'hr@innovate.com',
    companyPhone: '1-800-555-1234',
    companyWebsite: 'www.innovate.com',
    companyLinkedIn: 'linkedin.com/company/innovate-inc',
    candidateName: 'John Doe',
    candidateAddress: '456 Home Street, Anytown, USA 12345',
    date: new Date().toISOString().split('T')[0],
    jobTitle: 'Software Engineer Intern',
    startDate: new Date(new Date().setDate(new Date().getDate() + 14)).toISOString().split('T')[0],
    salary: 60000,
    salaryFrequency: 'annually',
    perksAndBenefits: '',
    managerName: 'Jane Smith',
    offerType: 'Internship',
    body: this.defaultBody,
    acceptanceDeadline: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().split('T')[0],
    signerName: 'Alex Chen',
    signerTitle: 'Hiring Manager',
    signerSignature: null,
    template: 'classic',
    fontFamily: 'Merriweather',
    headingColor: '#1D1D1D',
    bodyColor: '#1D1D1D',
    accentColor: '#2D3C77',
    logoAlignment: 'right',
  };

  letterData = signal<OfferLetterData>(this.initialState);

  updateLetterData(patch: Partial<OfferLetterData>) {
    this.letterData.update(currentData => ({ ...currentData, ...patch }));
  }
  
  getFormattedBody(): string {
    const data = this.letterData();
    const currencyFormatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    });

    let compensationText = '';
    if (data.salary && data.salary > 0) {
      compensationText = `Your starting salary will be ${currencyFormatter.format(data.salary)} ${data.salaryFrequency}.`;
    } else if (data.perksAndBenefits) {
      compensationText = `As part of your internship, you will receive the following perks and benefits:\n${data.perksAndBenefits}`;
    } else {
      compensationText = 'This is an unpaid position.';
    }

    return data.body
      .replace(/{companyName}/g, data.companyName)
      .replace(/{jobTitle}/g, data.jobTitle)
      .replace(/{offerType}/g, data.offerType)
      .replace(/{startDate}/g, new Date(data.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }))
      .replace(/{managerName}/g, data.managerName)
      .replace(/{compensationDetails}/g, compensationText)
      .replace(/{acceptanceDeadline}/g, new Date(data.acceptanceDeadline).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
  }
}
