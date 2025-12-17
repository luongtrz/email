import { Mail } from '@/database/entities/mail.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class MailRepository {
  constructor(
    @InjectRepository(Mail)
    private readonly mailRepo: Repository<Mail>,
  ) {}

  async findByGmailMessageId(gmailMessageId: string): Promise<Mail | null> {
    return this.mailRepo.findOne({ where: { gmailMessageId } });
  }

  async findAllEmailsByUserId(userId: string): Promise<Mail[]> {
    return this.mailRepo.find({
      where: { userId },
      order: { receivedAt: 'DESC' },
      take: 100,
    });
  }

  async count(): Promise<number> {
    return this.mailRepo.count();
  }

  async bulkUpsert(mails: Partial<Mail>[]): Promise<{ inserted: number; skipped: number }> {
    let inserted = 0;
    let skipped = 0;

    for (const mail of mails) {
      try {
        const existing = await this.findByGmailMessageId(mail.gmailMessageId!);
        if (!existing) {
          await this.mailRepo.save(mail);
          inserted++;
        } else {
          skipped++;
        }
      } catch (error) {
        console.error(`Error upserting mail ${mail.gmailMessageId}:`, error.message);
        skipped++;
      }
    }

    return { inserted, skipped };
  }
}
