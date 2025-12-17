import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SearchMailDto {
  @ApiProperty({
    description: 'Fuzzy search query for emails (searches sender and subject)',
    required: true,
    example: 'gmail',
    minLength: 1,
  })
  @IsString()
  @MinLength(1, { message: 'Search query must not be empty' })
  q: string;
}
