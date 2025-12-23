import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('kanban_columns')
export class KanbanColumn {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column()
  title: string;

  @Column({ type: 'varchar' })
  status: string;

  @Column({ name: 'gmail_label_id', nullable: true })
  gmailLabelId?: string | null;

  @Column({ name: 'gmail_label_name', nullable: true })
  gmailLabelName?: string | null;

  @Column()
  color: string;

  @Column()
  icon: string;

  @Column({ type: 'int' })
  order: number;

  @Column({ name: 'is_system', default: false })
  isSystem: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
