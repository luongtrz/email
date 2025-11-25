import {
  Controller,
  Get,
  Param,
  Query,
  Post,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EmailsService } from './emails.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetEmailsDto } from './dto/get-emails.dto';
import { Email } from './interfaces/email.interface';

@ApiTags('emails')
@Controller('emails')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EmailsController {
  constructor(private readonly emailsService: EmailsService) {}

  @Get('mailboxes')
  @ApiOperation({ summary: 'Get all mailboxes with counts' })
  async getMailboxes(@Request() req): Promise<any> {
    return this.emailsService.getMailboxes(req.user.id);
  }

  @Get('mailboxes/:folderId/emails')
  @ApiOperation({ summary: 'Get emails in a specific mailbox' })
  async getEmailsByFolder(
    @Request() req,
    @Param('folderId') folderId: string,
    @Query() dto: GetEmailsDto,
  ): Promise<{ emails: Email[]; pagination: any }> {
    return this.emailsService.getEmails(req.user.id, {
      ...dto,
      folder: folderId,
    });
  }

  @Get('list')
  @ApiOperation({ summary: 'Get all emails with filters' })
  async getEmails(@Request() req, @Query() dto: GetEmailsDto): Promise<{ emails: Email[]; pagination: any }> {
    return this.emailsService.getEmails(req.user.id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get email detail by ID' })
  async getEmailById(@Request() req, @Param('id') id: string): Promise<Email> {
    return this.emailsService.getEmailById(req.user.id, id);
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Mark email as read' })
  async markAsRead(@Request() req, @Param('id') id: string): Promise<{ message: string }> {
    return this.emailsService.markAsRead(req.user.id, id);
  }

  @Post(':id/star')
  @ApiOperation({ summary: 'Toggle email star' })
  async toggleStar(@Request() req, @Param('id') id: string): Promise<{ starred: boolean }> {
    return this.emailsService.toggleStar(req.user.id, id);
  }

  @Post('seed')
  @ApiOperation({ summary: 'Seed mock emails for testing' })
  async seedMockEmails(@Request() req): Promise<{ message: string; count: number }> {
    return this.emailsService.seedMockEmails(req.user.id);
  }
}
