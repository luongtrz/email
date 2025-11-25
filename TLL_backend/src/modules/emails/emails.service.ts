import { Injectable, NotFoundException } from '@nestjs/common';
import { GetEmailsDto } from './dto/get-emails.dto';
import { Email } from './interfaces/email.interface';
import * as mockData from './mock.json';

@Injectable()
export class EmailsService {
  private emails: Email[] = [];

  constructor() {
    this.generateMockEmails();
  }

  private generateMockEmails() {
    const now = new Date();

    for (let i = 0; i < 50; i++) {
      const sender = mockData.senders[Math.floor(Math.random() * mockData.senders.length)];
      const subject = mockData.subjects[Math.floor(Math.random() * mockData.subjects.length)];
      const daysAgo = Math.floor(Math.random() * 30);
      const date = new Date(now);
      date.setDate(date.getDate() - daysAgo);

      const folderIds = ['inbox', 'sent', 'drafts', 'trash'];
      const folder = i < 35 ? 'inbox' : folderIds[Math.floor(Math.random() * folderIds.length)];

      this.emails.push({
        id: `email-${i + 1}`,
        from: { name: sender.name, email: sender.email },
        to: ['me@example.com'],
        subject,
        preview: `This is a preview of the email content. ${subject} - Lorem ipsum dolor sit amet, consectetur adipiscing elit...`,
        body: `
          <div>
            <p>Hi there,</p>
            <p>This is the full content of the email regarding: <strong>${subject}</strong></p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.</p>
            <p>Best regards,<br/>${sender.name}</p>
          </div>
        `,
        date,
        read: Math.random() > 0.4,
        starred: Math.random() > 0.8,
        folder,
        attachments: Math.random() > 0.7
          ? [
              { name: 'document.pdf', size: '2.4 MB', type: 'application/pdf' },
              { name: 'image.png', size: '856 KB', type: 'image/png' },
            ]
          : undefined,
      });
    }

    // Sort by date descending
    this.emails.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  async getMailboxes(userId: string) {
    const mailboxes = mockData.folders.map((folder) => {
      const count = this.emails.filter((email) => email.folder === folder.id).length;
      return {
        id: folder.id,
        name: folder.name,
        icon: folder.icon,
        count,
        color: folder.color,
      };
    });

    return mailboxes;
  }

  async getEmails(userId: string, dto: GetEmailsDto) {
    const { folder, search, page = 1, limit = 20 } = dto;

    let filteredEmails = [...this.emails];

    if (folder) {
      filteredEmails = filteredEmails.filter((email) => email.folder === folder);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filteredEmails = filteredEmails.filter(
        (email) =>
          email.subject.toLowerCase().includes(searchLower) ||
          email.from.name.toLowerCase().includes(searchLower) ||
          email.preview.toLowerCase().includes(searchLower),
      );
    }

    const total = filteredEmails.length;
    const start = (page - 1) * limit;
    const paginatedEmails = filteredEmails.slice(start, start + limit);

    return {
      emails: paginatedEmails,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getEmailById(userId: string, emailId: string) {
    const email = this.emails.find((e) => e.id === emailId);

    if (!email) {
      throw new NotFoundException('Email not found');
    }

    // Mark as read
    email.read = true;

    return email;
  }

  async markAsRead(userId: string, emailId: string) {
    const email = this.emails.find((e) => e.id === emailId);

    if (!email) {
      throw new NotFoundException('Email not found');
    }

    email.read = true;
    return { message: 'Email marked as read' };
  }

  async toggleStar(userId: string, emailId: string) {
    const email = this.emails.find((e) => e.id === emailId);

    if (!email) {
      throw new NotFoundException('Email not found');
    }

    email.starred = !email.starred;
    return { starred: email.starred };
  }

  async seedMockEmails(userId: string) {
    return {
      message: 'Mock emails already loaded from mock.json',
      count: this.emails.length,
    };
  }
}
