import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { KanbanEmailStatus } from '@/database/entities/email-metadata.entity';

export class UpdateStatusDto {
  @ApiProperty({ enum: KanbanEmailStatus })
  @IsEnum(KanbanEmailStatus)
  status: KanbanEmailStatus;
}

