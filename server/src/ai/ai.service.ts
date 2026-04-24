import { Injectable, ServiceUnavailableException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AiService {
  private readonly apiKey: string;
  private readonly apiUrl = 'https://generativelanguage.googleapis.com/v1/models/gemini-flash-latest:generateContent';

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

    const prompt = `You are an experienced home inspector writing a professional finding comment.
      Property year built: ${yearBuilt}
      Section: ${section}
      Severity: ${severity}
      Location: ${location || 'not specified'}
      Inspector note: ${shortNote}

      Write a professional 2-3 sentence inspection finding comment. Be specific, use industry language, recommend appropriate action. Do not use filler phrases like "it was observed" or "it was noted".`;

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
