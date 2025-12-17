import {
  Body,
  Controller,
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

 @Get('emails')
  @ApiOperation({
    summary: 'Get kanban emails with filtering and sorting',
    description:
      'Fetch emails for a specific Kanban column (status) with optional filters (isUnread, hasAttachment, from) and sorting (date_desc, date_asc, sender_asc)',
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

