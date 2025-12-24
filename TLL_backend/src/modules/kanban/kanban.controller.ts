import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GmailAuthGuard } from '../emails/guards/gmail-auth.guard';
import { GetKanbanEmailsDto } from './dto/get-kanban-emails.dto';
import { GetInitialKanbanEmailsDto } from './dto/get-initial-kanban-emails.dto';
import { KanbanEmailsService } from './kanban.service';
import { KanbanEmail } from './interfaces/kanban-email.interface';
import { UpdateStatusDto } from './dto/update-status.dto';
import { SnoozeDto } from './dto/snooze.dto';
import { SummarizeDto } from './dto/summarize.dto';

@ApiTags('kanban')
@Controller('kanban')
@UseGuards(JwtAuthGuard, GmailAuthGuard)
@ApiBearerAuth()
export class KanbanEmailsController {
  constructor(private readonly kanbanEmailsService: KanbanEmailsService) {}

  @Get('emails/initial')
  @ApiOperation({
    summary: 'Initial load: Fetch emails from Gmail and create metadata',
    description:
      'Use this endpoint on first load to fetch emails from Gmail and automatically create metadata records with default status (INBOX). ' +
      'This endpoint fetches directly from Gmail API and creates metadata for emails that don\'t have it yet. ' +
      'Subsequent loads should use GET /api/kanban/emails with status filters for better performance.',
  })
  async getInitialKanbanEmails(
    @Request() req,
    @Query() dto: GetInitialKanbanEmailsDto,
  ) {
    return this.kanbanEmailsService.getInitialKanbanEmails(req.user.id, dto);
  }

  @Get('emails')
  @ApiOperation({
    summary: 'Get kanban emails with filtering and sorting',
    description:
      'Fetch emails for a specific Kanban column (status) with optional filters (isUnread, hasAttachment, from) and sorting (date_desc, date_asc, sender_asc). ' +
      'This endpoint requires existing metadata. Use GET /api/kanban/emails/initial for first load or when metadata is missing.',
  })
  async getKanbanEmails(@Request() req, @Query() dto: GetKanbanEmailsDto) {
    return this.kanbanEmailsService.getKanbanEmailsWithFilters(
      req.user.id,
      dto,
    );
  }

  @Get('emails/:id/detail')
  @ApiOperation({ summary: 'Get kanban email detail merged with metadata' })
  async getKanbanEmailDetail(
    @Request() req,
    @Param('id') id: string,
  ): Promise<KanbanEmail> {
    return this.kanbanEmailsService.getKanbanEmailDetail(req.user.id, id);
  }

  @Patch('emails/:id/status')
  @ApiOperation({ summary: 'Update kanban card status' })
  async updateStatus(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.kanbanEmailsService.updateStatus(req.user.id, id, dto);
  }

  @Post('emails/:id/snooze')
  @ApiOperation({ summary: 'Snooze an email and mark as SNOOZED' })
  async snoozeEmail(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: SnoozeDto,
  ) {
    return this.kanbanEmailsService.snoozeEmail(req.user.id, id, dto);
  }

  @Post('emails/restore-snoozed')
  @ApiOperation({ summary: 'Restore emails whose snooze has expired' })
  async restoreSnoozed(@Request() req) {
    return this.kanbanEmailsService.restoreSnoozed(req.user.id);
  }

  @Post('emails/:id/summarize')
  @ApiOperation({ summary: 'Generate AI summary using Gemini' })
  async summarizeEmail(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: SummarizeDto,
  ) {
    return this.kanbanEmailsService.summarizeEmail(req.user.id, id, dto);
  }

  @Get('search')
  @ApiOperation({ summary: 'Semantic search over emails (placeholder)' })
  async semanticSearch(@Request() req, @Query('q') query: string) {
    return this.kanbanEmailsService.semanticSearch(req.user.id, query);
  }
}

