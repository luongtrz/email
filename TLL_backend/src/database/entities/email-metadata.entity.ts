import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum KanbanEmailStatus {
    INBOX = 'INBOX',
    TODO = 'TODO',
    IN_PROGRESS = 'IN_PROGRESS',
    DONE = 'DONE',
    SNOOZED = 'SNOOZED',
}

@Entity('email_metadata')
@Unique(['emailId', 'userId'])
export class EmailMetadata {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'email_id' })
  emailId: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'INBOX',
  })
  status: string;

  @Column({ name: 'previous_status', type: 'varchar', length: 50, nullable: true })
  previousStatus?: string | null;

  @Column({ name: 'ai_summary', type: 'text', nullable: true })
  aiSummary?: string | null;

  @Column({ name: 'snooze_until', type: 'timestamptz', nullable: true })
  snoozeUntil?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

