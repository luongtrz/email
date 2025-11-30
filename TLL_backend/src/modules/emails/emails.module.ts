import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailsController } from './emails.controller';
import { EmailsService } from './emails.service';
import { GmailApiService } from './services/gmail-api.service';
import { GmailParserService } from './services/gmail-parser.service';
import { GmailAuthGuard } from './guards/gmail-auth.guard';
import { User } from '../../database/entities/user.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), AuthModule],
  controllers: [EmailsController],
  providers: [EmailsService, GmailApiService, GmailParserService, GmailAuthGuard],
  exports: [EmailsService],
})
export class EmailsModule {}
