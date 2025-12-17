import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsInt, Min, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchEmailDto {
  @ApiProperty({
    example: 'meeting',
    description: 'Search query (searches subject, sender name, and sender email)',
  })
  @IsNotEmpty({ message: 'Search query cannot be empty' })
  @IsString()
  q: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Page number',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 20,
    description: 'Number of results per page',
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
