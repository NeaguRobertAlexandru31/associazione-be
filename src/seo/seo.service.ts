import { Injectable, Logger } from '@nestjs/common';

export interface SeoData {
  title: string;
  description: string;
  keywords: string[];
  ogDescription: string;
  imageAlts?: string[];
}

const ASSOCIATION_NAME = 'Marama APS ETS';
const ASSOCIATION_DESCRIPTION =
  'associazione di promozione sociale della cultura rumena in Italia, con sede a Pinerolo (TO)';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3-flash-preview',
];

@Injectable()
export class SeoService {
  private readonly logger = new Logger(SeoService.name);
  private readonly groqKey = process.env.GROQ_API_KEY;
  private readonly geminiKey = process.env.GEMINI_API_KEY;

  async generate(content: {
    type: 'event' | 'article' | 'project';
    title: string;
    description?: string;
    categories?: string[];
    location?: string;
    date?: string;
    imageUrls?: string[];
  }): Promise<SeoData | null> {
    if (!this.groqKey && !this.geminiKey) {
      this.logger.warn('Nessuna API key SEO configurata (GROQ_API_KEY / GEMINI_API_KEY) — SEO skippata');
      return null;
    }

    this.logger.log(
      `Generazione SEO per ${content.type}: "${content.title}" (immagini: ${content.imageUrls?.length ?? 0})...`,
    );

    const prompt = this.buildPrompt(content);

    // 1. Prova Groq (primario — veloce e affidabile)
    if (this.groqKey) {
      const result = await this.callGroq(prompt);
      if (result) return result;
    }

    // 2. Fallback Gemini — prova ogni modello su 503
    if (this.geminiKey) {
      const parts = this.buildGeminiParts(prompt, content.imageUrls);
      for (const model of GEMINI_MODELS) {
        const result = await this.callGemini(model, parts);
        if (result === 'retry') {
          this.logger.warn(`Gemini ${model} non disponibile (503), provo fallback...`);
          continue;
        }
        if (result) return result;
        break;
      }
    }

    this.logger.error('Tutti i provider SEO non disponibili — SEO skippata');
    return null;
  }

  private async callGroq(prompt: string): Promise<SeoData | null> {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.groqKey}`,
        },
        body: JSON.stringify({
          model: 'qwen/qwen3.8-27b',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.3,
        }),
      });

      if (!res.ok) {
        this.logger.warn(`Groq error: ${res.status} — provo Gemini`);
        return null;
      }

      const data = await res.json();
      const parsed = JSON.parse(data.choices[0].message.content) as SeoData;
      if (!parsed.title || !parsed.description) return null;

      this.logger.log(`SEO generata con Groq (qwen3.8-27b)`);
      return parsed;
    } catch (err) {
      this.logger.warn('Groq non raggiungibile — provo Gemini', err);
      return null;
    }
  }

  private async callGemini(model: string, parts: object[]): Promise<SeoData | null | 'retry'> {
    try {
      const res = await fetch(
        `${GEMINI_BASE}/${model}:generateContent?key=${this.geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.3 },
          }),
        },
      );

      if (res.status === 503) return 'retry';

      if (!res.ok) {
        this.logger.error(`Gemini API error (${model}): ${res.status} ${await res.text()}`);
        return null;
      }

      const data = await res.json();
      const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      const parsed = JSON.parse(text) as SeoData;
      if (!parsed.title || !parsed.description) return null;

      this.logger.log(`SEO generata con Gemini (${model})`);
      return parsed;
    } catch (err) {
      this.logger.error(`Errore generazione SEO Gemini (${model})`, err);
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
    imageUrls?: string[];
  }): string {
    const typeLabel = { event: 'evento', article: 'articolo', project: 'progetto' }[content.type];
    const extra = [
      content.location && `Luogo: ${content.location}`,
      content.date && `Data: ${content.date}`,
      content.categories?.length && `Categorie: ${content.categories.join(', ')}`,
    ]
      .filter(Boolean)
      .join('\n');

    const imageCount = content.imageUrls?.length ?? 0;
    const imageAltInstruction = imageCount > 0
      ? `\n- "imageAlts": array di esattamente ${imageCount} stringhe — una per ogni immagine nell'ordine in cui sono elencate. Ogni alt deve descrivere concretamente cosa si vede nell'immagine (persone, cibo, luogo, atmosfera) collegandolo al contesto dell'${typeLabel} (es. "Piatti di sarmale e mici preparati per la festa rumena di ${ASSOCIATION_NAME} a ${content.location ?? 'Pinerolo'}")`
      : '';

    return `Sei un esperto SEO. Genera metadati SEO ottimizzati in italiano per il seguente ${typeLabel} di ${ASSOCIATION_NAME}, ${ASSOCIATION_DESCRIPTION}.

Titolo: ${content.title}
${content.description ? `Descrizione: ${content.description}` : ''}
${extra}
${imageCount > 0 ? `\nSono presenti ${imageCount} immagini dell'${typeLabel}. Analizzale e descrivi cosa vedi in ciascuna nel contesto dell'evento.` : ''}

Rispondi SOLO con un JSON valido in questo formato esatto (nessun testo aggiuntivo):
{
  "title": "titolo SEO ottimizzato (max 60 caratteri, includi il nome ${ASSOCIATION_NAME})",
  "description": "meta description ottimizzata (max 155 caratteri, coinvolgente e con call to action)",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "ogDescription": "testo Open Graph (max 200 caratteri, per condivisione social)"${imageCount > 0 ? `,${imageAltInstruction}` : ''}
}`;
  }

  // Parts Gemini: testo + immagini come fileData (URL pubblico CloudFront)
  private buildGeminiParts(prompt: string, imageUrls?: string[]): object[] {
    const parts: object[] = [{ text: prompt }];
    for (const url of (imageUrls ?? []).slice(0, 3)) {
      parts.push({ fileData: { mimeType: this.guessMimeType(url), fileUri: url } });
    }
    return parts;
  }

  private guessMimeType(url: string): string {
    const ext = url.split('?')[0].split('.').pop()?.toLowerCase();
    const map: Record<string, string> = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg',
      png: 'image/png', webp: 'image/webp', gif: 'image/gif',
    };
    return map[ext ?? ''] ?? 'image/webp';
  }
}
