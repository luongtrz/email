import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SemanticSearchService } from './semantic-search.service';

class SemanticSearchDto {
  @IsString()
  q: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  minSimilarity?: number;
}

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private semanticSearchService: SemanticSearchService) {}

  /**
   * POST /api/search/semantic
   * Hybrid semantic + keyword search
   */
  @Post('semantic')
  async semanticSearch(@Request() req, @Body() dto: SemanticSearchDto) {
    const userId = req.user.id;

    return this.semanticSearchService.hybridSearch(userId, dto.q, {
      limit: dto.limit || 20,
      minSimilarity: dto.minSimilarity ?? 0.3, // Default 0.3 for better recall
    });
  }
}
