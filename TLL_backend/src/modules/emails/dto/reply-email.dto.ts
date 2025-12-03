import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsArray,
  IsEmail,
  ValidateIf,
} from 'class-validator';

export class ReplyEmailDto {
  @ApiProperty({ example: '<p>Reply body content</p>' })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiPropertyOptional({ example: ['cc@example.com'] })
  @IsArray()
  @IsEmail({}, { each: true })
  @ValidateIf((o) => o.cc !== undefined)
  cc?: string[];

  @ApiPropertyOptional({ example: ['bcc@example.com'] })
  @IsArray()
  @IsEmail({}, { each: true })
  @ValidateIf((o) => o.bcc !== undefined)
  bcc?: string[];

  @ApiPropertyOptional({
    example: false,
    description: 'If true, reply to all recipients including CC',
  })
  replyAll?: boolean;
}
