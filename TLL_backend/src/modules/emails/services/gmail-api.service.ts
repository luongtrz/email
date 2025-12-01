import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { google } from 'googleapis';
import { GoogleTokenService } from '../../auth/services/google-token.service';
import { GmailParserService } from './gmail-parser.service';

@Injectable()
export class GmailApiService {
  constructor(
    private googleTokenService: GoogleTokenService,
    private gmailParserService: GmailParserService,
  ) {}

  /**
   * Get Gmail client for a user
   */
  private async getGmailClient(userId: string) {
    const accessToken = await this.googleTokenService.getValidAccessToken(userId);
    const oauth2Client = this.googleTokenService.getOAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });
    return google.gmail({ version: 'v1', auth: oauth2Client });
  }

  /**
   * Get user's Gmail profile
   */
  async getProfile(userId: string) {
    const gmail = await this.getGmailClient(userId);
    const response = await gmail.users.getProfile({ userId: 'me' });
    return response.data;
  }

  /**
   * List labels (mailboxes)
   */
  async listLabels(userId: string) {
    const gmail = await this.getGmailClient(userId);
    const response = await gmail.users.labels.list({ userId: 'me' });
    return response.data.labels || [];
  }

  /**
   * Get a single label by ID (includes message counts)
   */
  async getLabel(userId: string, labelId: string) {
    const gmail = await this.getGmailClient(userId);
    const response = await gmail.users.labels.get({ userId: 'me', id: labelId });
    return response.data;
  }

  /**
   * List messages with pagination
   */
  async listMessages(
    userId: string,
    options: {
      labelIds?: string[];
      q?: string;
      maxResults?: number;
      pageToken?: string;
    } = {},
  ) {
    const gmail = await this.getGmailClient(userId);
    const { labelIds, q, maxResults = 20, pageToken } = options;

    const response = await gmail.users.messages.list({
      userId: 'me',
      labelIds,
      q,
      maxResults,
      pageToken,
    });

    return {
      messages: response.data.messages || [],
      nextPageToken: response.data.nextPageToken,
      resultSizeEstimate: response.data.resultSizeEstimate,
    };
  }

  /**
   * Get a single message by ID
   */
  async getMessage(userId: string, messageId: string) {
    const gmail = await this.getGmailClient(userId);
    const response = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    });
    return response.data;
  }

  /**
   * Get multiple messages by IDs
   */
  async getMessages(userId: string, messageIds: string[]) {
    const gmail = await this.getGmailClient(userId);
    const messages = await Promise.all(
      messageIds.map((id) =>
        gmail.users.messages.get({
          userId: 'me',
          id,
          format: 'full',
        }),
      ),
    );
    return messages.map((response) => response.data);
  }

  /**
   * Send an email
   */
  async sendMessage(
    userId: string,
    to: string[],
    subject: string,
    body: string,
    options: {
      cc?: string[];
      bcc?: string[];
      replyTo?: string;
      attachments?: Array<{ filename: string; content: Buffer; contentType: string }>;
    } = {},
  ) {
    const gmail = await this.getGmailClient(userId);
    const raw = this.gmailParserService.createRawMessage({
      to,
      subject,
      body,
      ...options,
    });

    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw,
      },
    });

    return response.data;
  }

  /**
   * Modify message (add/remove labels, mark as read/unread, etc.)
   */
  async modifyMessage(
    userId: string,
    messageId: string,
    addLabelIds?: string[],
    removeLabelIds?: string[],
  ) {
    const gmail = await this.getGmailClient(userId);
    const response = await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        addLabelIds,
        removeLabelIds,
      },
    });
    return response.data;
  }

  /**
   * Get attachment
   */
  async getAttachment(userId: string, messageId: string, attachmentId: string) {
    const gmail = await this.getGmailClient(userId);
    const response = await gmail.users.messages.attachments.get({
      userId: 'me',
      messageId,
      id: attachmentId,
    });
    return response.data;
  }

  /**
   * Search messages using Gmail query syntax
   */
  async searchMessages(
    userId: string,
    query: string,
    maxResults: number = 20,
    pageToken?: string,
  ) {
    return this.listMessages(userId, {
      q: query,
      maxResults,
      pageToken,
    });
  }
}

