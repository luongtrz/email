import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateStatusDto {
  @ApiProperty({ description: 'Status from localStorage column (e.g., INBOX, TODO, custom status)' })
  @IsString()
  @Length(1, 50)
  status: string;

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

