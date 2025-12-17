import { Module } from '@nestjs/common';
import { EmailsController } from './emails.controller';
import { EmailsService } from './emails.service';
import { GmailApiService } from './services/gmail-api.service';
import { GmailParserService } from './services/gmail-parser.service';
import { GmailSyncService } from './services/gmail-sync.service';
import { FuzzySearchService } from './services/fuzzy-search.service';
import { GmailAuthGuard } from './guards/gmail-auth.guard';
import { AuthModule } from '../auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@/database/entities/user.entity';
import { Mail } from '@/database/entities/mail.entity';
import { MailRepository } from './repositories/mail.repository';

@Module({
  imports: [TypeOrmModule.forFeature([User, Mail]), AuthModule],
  controllers: [EmailsController],
  providers: [
    EmailsService,
    GmailApiService,
    GmailParserService,
    GmailSyncService,
    FuzzySearchService,
    MailRepository,
    GmailAuthGuard,
  ],
  exports: [
    EmailsService,
    GmailApiService,
    GmailParserService,
    GmailAuthGuard,
  ],
})
export class EmailsModule {}
