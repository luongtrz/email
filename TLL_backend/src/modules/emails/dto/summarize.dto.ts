import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class SummarizeDto {
  @ApiPropertyOptional({
    description: 'Optional raw text to summarize instead of fetching body',
  })
  @IsOptional()
  @IsString()
  text?: string;
}

