import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class EmbeddingService {
  constructor(private configService: ConfigService) {}

  private getGeminiClient() {
    const apiKey = this.configService.get<string>('app.gemini.apiKey');
    if (!apiKey) {
      throw new BadRequestException('Gemini API key is not configured');
    }
    return new GoogleGenerativeAI(apiKey);
  }

  /**
   * Generate embedding for text using Gemini text-embedding-004
   * @returns 768-dimensional vector
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const client = this.getGeminiClient();
    const model = client.getGenerativeModel({
      model: 'text-embedding-004',
    });

    const result = await model.embedContent(text);
    return result.embedding.values;
  }

  /**
   * Generate embedding for email content (subject + body)
   */
  async generateEmailEmbedding(subject: string, body: string): Promise<number[]> {
    // Combine subject and body with emphasis on subject
    const text = `Subject: ${subject}\n\n${body}`;
    return this.generateEmbedding(text);
  }

  /**
   * Convert number[] to PostgreSQL vector format
   */
  vectorToString(embedding: number[]): string {
    return `[${embedding.join(',')}]`;
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }
}
