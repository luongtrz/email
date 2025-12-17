import {
    Entity,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    Column,
    OneToMany,
} from 'typeorm';
import { Mail } from './mail.entity';
  
@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid', { name: 'id' })
    id: string;

    @Column({ unique: true })
    email: string;

    @Column()
    name: string;

    @Column({ nullable: true })
    password: string;

    @Column({ nullable: true, name: 'google_id' })
    googleId: string;

    @Column({ nullable: true, name: 'refresh_token' })
    refreshToken: string;

    @Column({ nullable: true, name: 'google_access_token', type: 'text' })
    googleAccessToken: string;

    @Column({ nullable: true, name: 'google_refresh_token', type: 'text' })
    googleRefreshToken: string;

    @Column({ nullable: true, name: 'google_token_expiry', type: 'timestamptz' })
    googleTokenExpiry: Date;

    @Column({ default: 'user' })
    role: string;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt: Date;

    // Relations
    @OneToMany(() => Mail, (mail) => mail.user)
    mails: Mail[];
}
  