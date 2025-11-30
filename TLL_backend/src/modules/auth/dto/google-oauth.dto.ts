import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class GoogleOAuthCallbackDto {
  @ApiProperty({ example: '4/0AeanS...' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiPropertyOptional({ example: 'state123' })
  @IsString()
  @IsOptional()
  state?: string;
}

