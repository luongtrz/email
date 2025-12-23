import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateStatusDto {
  @ApiProperty({ description: 'Column ID to move email to' })
  @IsUUID()
  columnId: string;

  @ApiPropertyOptional({
    description: 'Gmail label ID to apply when moving to this column',
  })
  @IsOptional()
  @IsString()
  gmailLabelId?: string | null;

  @ApiPropertyOptional({
    description: 'Previous Gmail label ID to remove when moving columns',
  })
  @IsOptional()
  @IsString()
  previousGmailLabelId?: string | null;
}

