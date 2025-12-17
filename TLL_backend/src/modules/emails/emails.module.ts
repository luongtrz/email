import { Module } from '@nestjs/common';
import { EmailsController } from './emails.controller';
import { EmailsService } from './emails.service';
import { GmailApiService } from './services/gmail-api.service';
import { GmailParserService } from './services/gmail-parser.service';
import { GmailSearchService } from './services/gmail-search.service';
import { GmailAuthGuard } from './guards/gmail-auth.guard';
import { AuthModule } from '../auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@/database/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User]), AuthModule],
  controllers: [EmailsController],
  providers: [
    EmailsService,
    GmailApiService,
    GmailParserService,
    GmailSearchService,
    GmailAuthGuard,
  ],
  exports: [
    EmailsService,
    GmailApiService,
    GmailParserService,
    GmailSearchService,
    GmailAuthGuard,
  ],
})
export class EmailsModule {}
