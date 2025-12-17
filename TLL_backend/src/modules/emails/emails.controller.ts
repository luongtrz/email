import {
  Controller,
  Get,
  Param,
  Query,
  Post,
  Body,
  UseGuards,
  Request,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EmailsService } from './emails.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GmailAuthGuard } from './guards/gmail-auth.guard';
import { GetEmailsDto } from './dto/get-emails.dto';
import { SendEmailDto } from './dto/send-email.dto';
import { ModifyEmailDto } from './dto/modify-email.dto';
import { ReplyEmailDto } from './dto/reply-email.dto';
import { ForwardEmailDto } from './dto/forward-email.dto';
import { Email } from './interfaces/email.interface';
import { GetDetailEmailsDto } from './dto/get-detail-emails.dto';
import { SearchEmailDto } from './dto/search-email.dto';
import { SyncGmailDto } from './dto/sync-gmail.dto';
import { SearchMailDto } from './dto/search-mail.dto';
import { GmailSyncService } from './services/gmail-sync.service';
import { FuzzySearchService } from './services/fuzzy-search.service';

@ApiTags('emails')
@Controller()
@UseGuards(JwtAuthGuard, GmailAuthGuard)
@ApiBearerAuth()
export class EmailsController {
  constructor(
    private readonly emailsService: EmailsService,
    private readonly gmailSyncService: GmailSyncService,
    private readonly fuzzySearchService: FuzzySearchService,
  ) {}

  @Get('mailboxes')
  @ApiOperation({ summary: 'Get all mailboxes with counts' })
  async getMailboxes(@Request() req): Promise<any> {
    return this.emailsService.getMailboxes(req.user.id);
  }

  @Get('mailboxes/:id/emails')
  @ApiOperation({ summary: 'Get emails in a specific mailbox' })
  async getEmailsByMailbox(
    @Request() req,
    @Param('id') mailboxId: string,
    @Query() dto: GetDetailEmailsDto,
  ): Promise<{ emails: Email[]; pagination: any }> {
    return this.emailsService.getEmails(req.user.id, {
      ...dto,
      folder: mailboxId,
    });
  }

  // Specific routes must come before parameterized routes
  @Post('emails/sync')
  @ApiOperation({ summary: 'Sync emails from Gmail inbox to local database' })
  async syncGmail(@Request() req, @Body() dto: SyncGmailDto) {
    return this.gmailSyncService.syncInboxEmails(
      req.user.id,
      dto.maxResults,
    );
  }

  @Get('emails/search')
  @ApiOperation({
    summary: 'Fuzzy search on synced emails',
    description:
      'Search stored emails using Fuse.js fuzzy matching. ' +
      'Searches normalized sender and subject fields. Returns top 20 results by relevance.',
  })
  async searchGmail(@Request() req,@Query() dto: SearchMailDto) {
    return this.fuzzySearchService.searchEmails(req.user.id, dto.q);
  }

  @Post('emails/send')
  @ApiOperation({ summary: 'Send an email' })
  async sendEmail(@Request() req, @Body() dto: SendEmailDto) {
    return this.emailsService.sendEmail(req.user.id, dto);
  }

  @Get('emails/list')
  @ApiOperation({ summary: 'Get all emails with filters (legacy)' })
  async getEmails(
    @Request() req,
    @Query() dto: GetEmailsDto,
  ): Promise<{ emails: Email[]; pagination: any }> {
    return this.emailsService.getEmails(req.user.id, dto);
  }

  @Get('emails/:id')
  @ApiOperation({ summary: 'Get email detail by ID' })
  async getEmailById(@Request() req, @Param('id') id: string): Promise<Email> {
    return this.emailsService.getEmailById(req.user.id, id);
  }

  @Post('emails/:id/modify')
  @ApiOperation({
    summary: 'Modify email (mark read/unread, star, archive, etc.)',
  })
  async modifyEmail(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: ModifyEmailDto,
  ) {
    return this.emailsService.modifyEmail(req.user.id, id, dto);
  }

  @Post('emails/:id/reply')
  @ApiOperation({ summary: 'Reply to an email' })
  async replyEmail(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: ReplyEmailDto,
  ) {
    return this.emailsService.replyEmail(req.user.id, id, dto);
  }

  @Post('emails/:id/forward')
  @ApiOperation({ summary: 'Forward an email' })
  async forwardEmail(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: ForwardEmailDto,
  ) {
    return this.emailsService.forwardEmail(req.user.id, id, dto);
  }

  @Get('attachments/:id')
  @ApiOperation({ summary: 'Download attachment by attachment ID' })
  async getAttachment(
    @Request() req,
    @Param('id') attachmentId: string,
    @Query('messageId') messageId: string,
    @Res() res: Response,
  ) {
    if (!messageId) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'messageId query parameter is required',
      });
    }

    const attachment = await this.emailsService.getAttachment(
      req.user.id,
      messageId,
      attachmentId,
    );

    // Set appropriate headers for file download
    res.setHeader(
      'Content-Type',
      attachment.contentType || 'application/octet-stream',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${attachment.filename}"`,
    );
    res.setHeader('Content-Length', attachment.size);

    return res.send(attachment.data);
  }

  // Legacy endpoints for backward compatibility
  @Post('emails/:id/read')
  @ApiOperation({ summary: 'Mark email as read (legacy)' })
  async markAsRead(@Request() req, @Param('id') id: string) {
    return this.emailsService.markAsRead(req.user.id, id);
  }

  @Post('emails/:id/star')
  @ApiOperation({ summary: 'Toggle email star (legacy)' })
  async toggleStar(@Request() req, @Param('id') id: string) {
    return this.emailsService.toggleStar(req.user.id, id);
  }
}
