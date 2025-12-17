import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum InitialLoadFolder {
  INBOX = 'INBOX',
  SENT = 'SENT',
  DRAFTS = 'DRAFTS',
  ALL = 'ALL',
}

export class GetInitialKanbanEmailsDto {
  @ApiPropertyOptional({
    description: 'Gmail folder to fetch from',
    enum: InitialLoadFolder,
    default: InitialLoadFolder.INBOX,
    example: InitialLoadFolder.INBOX,
  })
  @IsEnum(InitialLoadFolder)
  @IsOptional()
  folder?: InitialLoadFolder = InitialLoadFolder.INBOX;

  @ApiPropertyOptional({
    description: 'Number of emails to fetch (max 100)',
    example: 50,
    default: 50,
    minimum: 1,
    maximum: 100,
  })
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 50;

  @ApiPropertyOptional({
    description: 'Search query (Gmail syntax, e.g., "from:user@example.com")',
    example: 'from:user@example.com',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
