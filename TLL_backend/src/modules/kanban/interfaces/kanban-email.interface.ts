import { Email } from '@/modules/emails/interfaces/email.interface';
import { KanbanEmailStatus } from '@/database/entities/email-metadata.entity';

export interface KanbanEmail extends Email {
  status: KanbanEmailStatus;
  aiSummary?: string | null;
  snoozeUntil?: Date | null;
}

