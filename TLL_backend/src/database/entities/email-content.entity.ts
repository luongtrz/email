import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('email_contents')
@Index(['userId', 'emailId'], { unique: true })
export class EmailContent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'email_id' })
  @Index()
  emailId: string; // Gmail message ID

  @Column({ name: 'user_id' })
  @Index()
  userId: string;

  @Column({ type: 'text' })
  subject: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'text', name: 'body_preview' })
  bodyPreview: string;

  @Column({ type: 'jsonb', nullable: true })
  from: { name: string; email: string };

  @Column({ type: 'simple-array', nullable: true })
  to: string[];

  @Column({ type: 'timestamptz' })
  date: Date;

  // Vector embedding column (pgvector)
  // Note: Actual DB type is vector(768), but TypeORM doesn't support it natively
  // So we declare as text here and let migrations handle the real type
  @Column({
    type: 'text',
    nullable: true,
  })
  @Index('email_contents_embedding_idx', { synchronize: false }) // Created via migration
  embedding?: string; // Stored as vector(768) in DB via migration

  @Column({ name: 'embedding_model', type: 'varchar', nullable: true })
  embeddingModel?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
