import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsArray, IsEmail, ValidateIf } from 'class-validator';

export class SendEmailDto {
  @ApiProperty({ example: ['recipient@example.com'] })
  @IsArray()
  @IsEmail({}, { each: true })
  @IsNotEmpty()
  to: string[];

  @ApiProperty({ example: 'Test Subject' })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({ example: '<p>Email body content</p>' })
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

  @ApiPropertyOptional({ example: 'reply@example.com' })
  @IsString()
  @IsEmail()
  @ValidateIf((o) => o.replyTo !== undefined)
  replyTo?: string;
}

