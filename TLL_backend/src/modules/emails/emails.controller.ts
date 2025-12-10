import {
  Controller,
  Get,
  Param,
  Query,
  Post,
  Patch,
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
import { KanbanEmail } from './interfaces/kanban-email.interface';
import { GetDetailEmailsDto } from './dto/get-detail-emails.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { SnoozeDto } from './dto/snooze.dto';
import { SummarizeDto } from './dto/summarize.dto';

@ApiTags('emails')
@Controller()
@UseGuards(JwtAuthGuard, GmailAuthGuard)
@ApiBearerAuth()
export class EmailsController {
  constructor(private readonly emailsService: EmailsService) {}

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

  @Get('kanban/emails')
  @ApiOperation({ summary: 'Get kanban emails merged with metadata' })
  async getKanbanEmails(
    @Request() req,
    @Query() dto: GetEmailsDto,
  ): Promise<{ emails: KanbanEmail[]; pagination: any }> {
    return this.emailsService.getKanbanEmails(req.user.id, dto);
  }

  @Get('kanban/emails/:id/detail')
  @ApiOperation({ summary: 'Get kanban email detail merged with metadata' })
  async getKanbanEmailDetail(
    @Request() req,
    @Param('id') id: string,
  ): Promise<KanbanEmail> {
    return this.emailsService.getKanbanEmailDetail(req.user.id, id);
  }

  @Patch('kanban/emails/:id/status')
  @ApiOperation({ summary: 'Update kanban card status' })
  async updateStatus(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.emailsService.updateStatus(req.user.id, id, dto);
  }

  @Post('kanban/emails/:id/snooze')
  @ApiOperation({ summary: 'Snooze an email and mark as SNOOZED' })
  async snoozeEmail(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: SnoozeDto,
  ) {
    return this.emailsService.snoozeEmail(req.user.id, id, dto);
  }

  @Post('kanban/emails/restore-snoozed')
  @ApiOperation({ summary: 'Restore emails whose snooze has expired' })
  async restoreSnoozed(@Request() req) {
    return this.emailsService.restoreSnoozed(req.user.id);
  }

  @Post('kanban/emails/:id/summarize')
  @ApiOperation({ summary: 'Generate AI summary using Gemini' })
  async summarizeEmail(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: SummarizeDto,
  ) {
    return this.emailsService.summarizeEmail(req.user.id, id, dto);
  }

  @Get('kanban/search')
  @ApiOperation({ summary: 'Semantic search over emails (placeholder)' })
  async semanticSearch(@Request() req, @Query('q') query: string) {
    return this.emailsService.semanticSearch(req.user.id, query);
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
