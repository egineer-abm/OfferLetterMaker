
import { Injectable } from '@angular/core';
import { GoogleGenAI, Type } from '@google/genai';
import { OfferLetterData } from '../models/letter.model';

@Injectable({ providedIn: 'root' })
export class GeminiService {
  private ai: GoogleGenAI;
  
  constructor() {
    // IMPORTANT: The API key is sourced from environment variables.
    // Do not hardcode or expose it in the frontend.
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.error('API_KEY environment variable not set.');
      throw new Error('API_KEY environment variable not set.');
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  async generateLetter(prompt: string): Promise<Partial<OfferLetterData>> {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Based on the following request, generate the details for a professional offer letter. Request: "${prompt}"`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              companyName: { type: Type.STRING },
              candidateName: { type: Type.STRING },
              jobTitle: { type: Type.STRING },
              startDate: { type: Type.STRING, description: 'Date in YYYY-MM-DD format' },
              salary: { type: Type.NUMBER, nullable: true, description: 'The salary, or null if unpaid.' },
              salaryFrequency: { type: Type.STRING, enum: ['annually', 'monthly', 'hourly'] },
              perksAndBenefits: { type: Type.STRING, description: 'List of perks if the position is unpaid or has extra benefits.'},
              managerName: { type: Type.STRING },
              offerType: { type: Type.STRING, enum: ['Internship', 'Full-Time Employment'] },
              signerName: { type: Type.STRING, description: 'The name of the person signing the letter.'},
              signerTitle: { type: Type.STRING, description: 'The job title of the person signing the letter.'},
              body: { type: Type.STRING, description: 'The full body of the offer letter, using placeholders like {jobTitle}, {compensationDetails}, {signerName} etc. where appropriate.' }
            },
          },
        },
      });

      const jsonString = response.text.trim();
      const parsedData = JSON.parse(jsonString) as Partial<OfferLetterData>;
      return parsedData;

    } catch (error)
 {
      console.error('Error generating letter content:', error);
      throw new Error('Failed to generate letter content. Please check your prompt and API key.');
    }
  }
}
