import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('mail')
@Index(['userId', 'receivedAt'])
@Index(['gmailMessageId'], { unique: true })
export class Mail {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'gmail_message_id', unique: true })
  gmailMessageId: string;

  @Column()
  from: string;

  @Column()
  subject: string;

  @Column({ type: 'text' })
  snippet: string;

  @Column({ name: 'received_at', type: 'timestamptz' })
  receivedAt: Date;

  @Column({ name: 'from_normalized' })
  fromNormalized: string;

  @Column({ name: 'subject_normalized' })
  subjectNormalized: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.mails)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
