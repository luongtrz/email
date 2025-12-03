import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsString, IsOptional, IsBoolean } from 'class-validator';

export class ModifyEmailDto {
  @ApiPropertyOptional({ example: ['INBOX', 'STARRED'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  addLabels?: string[];

  @ApiPropertyOptional({ example: ['UNREAD'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  removeLabels?: string[];

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  markAsRead?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  star?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  archive?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Move email to trash',
  })
  @IsBoolean()
  @IsOptional()
  delete?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Permanently delete email (cannot be undone)',
  })
  @IsBoolean()
  @IsOptional()
  permanentDelete?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Unstar the email',
  })
  @IsBoolean()
  @IsOptional()
  unstar?: boolean;
}
