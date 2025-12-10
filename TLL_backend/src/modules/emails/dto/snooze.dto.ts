import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601 } from 'class-validator';

export class SnoozeDto {
  @ApiProperty({ example: '2025-12-11T08:30:00Z' })
  @IsISO8601()
  until: string;
}

