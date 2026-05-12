import { Injectable, ServiceUnavailableException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AiService {
  private readonly apiKey: string;
  private readonly apiUrl = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent';
  constructor(private config: ConfigService) {
    this.apiKey = this.config.get<string>('GEMINI_API_KEY') || '';
  }

  async generateComment(
    section: string,
    severity: string,
    location: string,
    description: string,
    yearBuilt: number
  ): Promise<{ description: string, recommendation: string }> {
    if (!this.apiKey) {
      throw new InternalServerErrorException('Gemini API key is not configured');
    }

    const prompt = `You are a Certified Master Home Inspector writing a formal inspection report. 
    I will provide you with raw, informal field notes. Your task is to REWRITE those notes into a clinical, professional observation and provide a recommendation.

    CONTEXT:
    - Property Year Built: ${yearBuilt}
    - Section: ${section}
    - Severity: ${severity}
    - Location: ${location || 'Not specified'}
    - Raw Field Note: ${description}

    STRICT RULES:
    1. REWRITE the "Raw Field Note" into a professional, objective "description" of 2-3 sentences. Do not use personal pronouns.
    2. NO LOCAL ENTITIES: Use generic terms like "licensed specialist" instead of specific company names.
    3. LIABILITY PROTECTION: Use clinical terms like "safety hazard" or "requires evaluation."
    4. NO FILLER: Start directly with the component.
    5. LENGTH: "description" must be under 600 characters. "recommendation" must be under 300 characters.

    FORMAT:
    Return a strictly valid JSON object with:
    - "description": The polished, professional version of the raw field notes.
    - "recommendation": A short, formal actionable recommendation (e.g., "Recommend evaluation and repair by a licensed electrician").`;

    try {
      const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Gemini API Error (${response.status}):`, errorBody);

        if (response.status === 429) {
          throw new BadRequestException('The AI service is currently busy due to high demand. Please wait a moment and try again.');
        }
        throw new ServiceUnavailableException(`Gemini API error: ${response.statusText}. Details: ${errorBody}`);
      }

      const data = await response.json();

      if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new InternalServerErrorException('Received invalid response format from Gemini API');
      }

      let textContent = data.candidates[0].content.parts[0].text;
      
      // Strip markdown json formatting if Gemini includes it
      if (textContent.startsWith('```json')) {
        textContent = textContent.replace(/^```json\n/, '').replace(/\n```$/, '');
      } else if (textContent.startsWith('```')) {
        textContent = textContent.replace(/^```\n/, '').replace(/\n```$/, '');
      }
      
      return JSON.parse(textContent.trim());
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ServiceUnavailableException || error instanceof InternalServerErrorException) {
        throw error;
      }
      console.error('AI Service Error:', error);
      throw new InternalServerErrorException('An unexpected error occurred while generating the AI content');
    }
  }
}
