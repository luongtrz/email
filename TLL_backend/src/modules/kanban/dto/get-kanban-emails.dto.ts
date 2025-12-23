import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsBoolean,
  IsInt,
  IsUUID,
  Min,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { KanbanEmailStatus } from '@/database/entities/email-metadata.entity';

export enum SortOption {
  DATE_DESC = 'date_desc',
  DATE_ASC = 'date_asc',
  SENDER_ASC = 'sender_asc',
}

export class GetKanbanEmailsDto {
  @ApiPropertyOptional({
    description: 'Column ID to filter by (new method)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  columnId?: string;

  @ApiPropertyOptional({
    enum: KanbanEmailStatus,
    example: KanbanEmailStatus.INBOX,
    description: 'Kanban column status (legacy method, use columnId instead)',
  })
  @IsOptional()
  @IsEnum(KanbanEmailStatus, {
    message: 'status must be one of: INBOX, TODO, IN_PROGRESS, DONE, SNOOZED',
  })
  status?: KanbanEmailStatus;

  @ApiPropertyOptional({
    example: true,
    description: 'Filter by unread status',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isUnread?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Filter by emails with attachments',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasAttachment?: boolean;

  @ApiPropertyOptional({
    example: 'john@example.com',
    description: 'Filter by sender email (partial match)',
  })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({
    enum: SortOption,
    example: SortOption.DATE_DESC,
    description: 'Sort option (default: date_desc)',
    default: SortOption.DATE_DESC,
  })
  @IsOptional()
  @IsEnum(SortOption)
  sort?: SortOption = SortOption.DATE_DESC;

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

  @ApiPropertyOptional({
    example: 0,
    description: 'Offset for pagination',
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}
