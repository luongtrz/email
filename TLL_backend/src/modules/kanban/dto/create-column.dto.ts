import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsInt } from 'class-validator';
import { KanbanEmailStatus } from '@/database/entities/email-metadata.entity';

export class CreateColumnDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty({ enum: KanbanEmailStatus })
  @IsEnum(KanbanEmailStatus)
  status: KanbanEmailStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gmailLabelId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gmailLabelName?: string | null;

  @ApiProperty()
  @IsString()
  color: string;

  @ApiProperty()
  @IsString()
  icon: string;

  @ApiProperty()
  @IsInt()
  order: number;
}
