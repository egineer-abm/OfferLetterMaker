
export interface OfferLetterData {
  companyName: string;
  companyAddress: string;
  companyLogo: string | null;
  companyEmail?: string;
  companyPhone?: string;
  companyWebsite?: string;
  companyLinkedIn?: string;
  candidateName: string;
  candidateAddress: string;
  date: string;
  jobTitle: string;
  startDate: string;
  salary: number | null;
  salaryFrequency: 'annually' | 'monthly' | 'hourly';
  perksAndBenefits: string;
  managerName: string;
  offerType: 'Internship' | 'Full-Time Employment';
  body: string;
  acceptanceDeadline: string;
  signerName: string;
  signerTitle: string;
  signerSignature: string | null;
  template: 'classic' | 'modern' | 'creative' | 'regal' | 'vibrant' | 'formal' | 'tech' | 'corporate';
  fontFamily: string;
  headingColor: string;
  bodyColor: string;
  accentColor: string;
  logoAlignment: 'left' | 'right';
  elementOrder: string[];
}
