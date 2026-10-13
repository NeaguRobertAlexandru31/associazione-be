import { Injectable, Logger } from '@nestjs/common';

export interface SeoData {
  title: string;
  description: string;
  keywords: string[];
  ogDescription: string;
}

@Injectable()
export class SeoService {
  private readonly logger = new Logger(SeoService.name);
  private readonly apiKey = process.env.GEMINI_API_KEY;
  private readonly apiUrl =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent';

  async generate(content: {
    type: 'event' | 'article' | 'project';
    title: string;
    description?: string;
    categories?: string[];
    location?: string;
    date?: string;
  }): Promise<SeoData | null> {
    if (!this.apiKey) {
      this.logger.warn('GEMINI_API_KEY non configurata — SEO skippata');
      return null;
    }

    const prompt = this.buildPrompt(content);
    this.logger.log(`Generazione SEO per ${content.type}: "${content.title}"...`);

    try {
      const res = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.3 },
        }),
      });

      if (!res.ok) {
        this.logger.error(`Gemini API error: ${res.status} ${await res.text()}`);
        return null;
      }

      const data = await res.json();
      const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      const parsed = JSON.parse(text) as SeoData;

      if (!parsed.title || !parsed.description) return null;
      return parsed;
    } catch (err) {
      this.logger.error('Errore generazione SEO', err);
      return null;
    }
  }

  private buildPrompt(content: {
    type: 'event' | 'article' | 'project';
    title: string;
    description?: string;
    categories?: string[];
    location?: string;
    date?: string;
  }): string {
    const typeLabel = { event: 'evento', article: 'articolo', project: 'progetto' }[content.type];
    const extra = [
      content.location && `Luogo: ${content.location}`,
      content.date && `Data: ${content.date}`,
      content.categories?.length && `Categorie: ${content.categories.join(', ')}`,
    ]
      .filter(Boolean)
      .join('\n');

    return `Sei un esperto SEO. Genera metadati SEO ottimizzati in italiano per il seguente ${typeLabel} di un'associazione culturale italiana.

Titolo: ${content.title}
${content.description ? `Descrizione: ${content.description}` : ''}
${extra}

Rispondi SOLO con un JSON valido in questo formato esatto:
{
  "title": "titolo SEO ottimizzato (max 60 caratteri, include il nome dell'associazione ACR Milano)",
  "description": "meta description ottimizzata (max 155 caratteri, coinvolgente e con call to action)",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "ogDescription": "testo Open Graph (max 200 caratteri, per condivisione social)"
}`;
  }
}
