import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { KanbanEmailStatus } from '@/database/entities/email-metadata.entity';

export class UpdateStatusDto {
  @ApiProperty({ enum: KanbanEmailStatus })
  @IsEnum(KanbanEmailStatus)
  status: KanbanEmailStatus;

  @ApiProperty({
    description: 'Gmail label ID to apply when moving to this column',
    required: false,
    nullable: true
  })
  @IsOptional()
  @IsString()
  gmailLabelId?: string | null;
}

