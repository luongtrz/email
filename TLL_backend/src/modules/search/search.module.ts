import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SemanticSearchService } from './semantic-search.service';
import { SearchController } from './search.controller';
import { EmailContent } from '../../database/entities/email-content.entity';
import { EmbeddingModule } from '../embeddings/embedding.module';
import { EmailsModule } from '../emails/emails.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmailContent]),
    EmbeddingModule,
    EmailsModule, // For GmailSearchService
  ],
  controllers: [SearchController],
  providers: [SemanticSearchService],
  exports: [SemanticSearchService],
})
export class SearchModule {}
