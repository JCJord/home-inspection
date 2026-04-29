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
    shortNote: string,
    yearBuilt: number
  ): Promise<string> {
    if (!this.apiKey) {
      throw new InternalServerErrorException('Gemini API key is not configured');
    }

    const prompt = `You are a Certified Master Home Inspector writing an objective, professional finding for a formal inspection report.

    CONTEXT:
    - Property Year Built: ${yearBuilt}
    - Section: ${section}
    - Severity: ${severity}
    - Location: ${location || 'Not specified'}
    - Inspector's Field Note: ${shortNote}

    TASK:
    Convert the Inspector's Field Note into a highly professional, clinical 2 to 3 sentence analysis. 

    STRICT RULES & CONSTRAINTS:
    1. NO LOCAL ENTITIES: Never name specific brands, utility companies (e.g., Comgás, PG&E), or contractors. Use generic terms like "licensed contractor," "local utility provider," or "qualified specialist."
    2. LIABILITY PROTECTION: Do not use alarmist, emotional, or legally dangerous words like "explosion," "death," "catastrophic," or "illegal." Use clinical terms like "safety hazard," "compromised," or "requires immediate evaluation."
    3. NO FILLER: Do not use phrases like "It was observed," "I noted," or "The inspector found." Start directly with the system or component.
    4. LENGTH LIMIT: The output MUST be strictly under 350 characters. Be punchy and direct.

    FORMAT:
    State the defect, explain the implication (why it matters), and state the recommended professional action.`;

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

      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ServiceUnavailableException || error instanceof InternalServerErrorException) {
        throw error;
      }
      console.error('AI Service Error:', error);
      throw new InternalServerErrorException('An unexpected error occurred while generating the AI comment');
    }
  }
}
