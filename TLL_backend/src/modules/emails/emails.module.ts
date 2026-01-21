import { Module } from '@nestjs/common';
import { EmailsController } from './emails.controller';
import { EmailsService } from './emails.service';
import { GmailApiService } from './services/gmail-api.service';
import { GmailParserService } from './services/gmail-parser.service';
import { GmailSearchService } from './services/gmail-search.service';
import { EmailContentService } from './services/email-content.service';
import { GmailAuthGuard } from './guards/gmail-auth.guard';
import { AuthModule } from '../auth/auth.module';
import { EmbeddingModule } from '../embeddings/embedding.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../database/entities/user.entity';
import { EmailContent } from '../../database/entities/email-content.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, EmailContent]),
    AuthModule,
    EmbeddingModule,
  ],
  controllers: [EmailsController],
  providers: [
    EmailsService,
    GmailApiService,
    GmailParserService,
    GmailSearchService,
    EmailContentService,
    GmailAuthGuard,
  ],
  exports: [
    EmailsService,
    GmailApiService,
    GmailParserService,
    GmailSearchService,
    EmailContentService,
    GmailAuthGuard,
  ],
})
export class EmailsModule { }
