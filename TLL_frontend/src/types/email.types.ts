export interface Email {
  id: string;
  threadId?: string; // Gmail thread ID
  from: {
    name: string;
    email: string;
    avatar?: string;
  };
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  preview: string;
  body: string;
  date: Date;
  read: boolean;
  starred: boolean;
  folder: 'inbox' | 'sent' | 'drafts' | 'trash' | 'spam' | 'important' | 'starred';
  labelIds?: string[]; // Gmail labels
  attachments?: {
    id: string; // Gmail attachment ID
    filename: string;
    mimeType: string;
    size: number; // bytes
  }[];
}

export interface Folder {
  id: string;
  name: string;
  icon: string;
  count: number;
  color?: string;
}

export interface EmailFilters {
  folder?: string;
  search?: string;
  read?: boolean;
  starred?: boolean;
}
