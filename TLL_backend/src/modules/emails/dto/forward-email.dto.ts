import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsArray,
  IsEmail,
  ValidateIf,
} from 'class-validator';

export class ForwardEmailDto {
  @ApiProperty({ example: ['recipient@example.com'] })
  @IsArray()
  @IsEmail({}, { each: true })
  @IsNotEmpty()
  to: string[];

  @ApiPropertyOptional({
    example: '<p>Additional message before forwarded content</p>',
  })
  @IsString()
  @ValidateIf((o) => o.body !== undefined)
  body?: string;

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
}
