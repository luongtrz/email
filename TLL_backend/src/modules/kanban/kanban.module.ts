import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { EmailsModule } from '../emails/emails.module';
import { KanbanEmailsController } from './kanban.controller';
import { KanbanEmailsService } from './kanban.service';
import { EmailMetadata } from '../../database/entities/email-metadata.entity';
import { User } from '../../database/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, EmailMetadata]), AuthModule, EmailsModule],
  controllers: [KanbanEmailsController],
  providers: [KanbanEmailsService],
})
export class KanbanEmailsModule { }

