import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { v7 as uuidv7 } from 'uuid';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

export enum Provider {
  EMAIL = 'email',
  GOOGLE = 'google',
}

@Entity()
@Index(['email'], { unique: true })
@Index(['referralCode'], { unique: true })
export class User {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'varchar', length: 255, name: 'password_hash' })
  passwordHash!: string;

  @Column({ type: 'boolean', default: false, name: 'is_verified' })
  isVerified!: boolean;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role!: UserRole;

  @Column({ type: 'varchar', length: 255, name: 'referral_code' })
  referralCode!: string;

  @Column({ type: 'varchar', length: 255, name: 'provider_id', nullable: true })
  providerId!: string;

  @Column({ type: 'enum', enum: Provider, nullable: true })
  provider!: Provider;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt!: Date;

  @Column({ type: 'timestamp', name: 'last_login', nullable: true })
  lastLogin!: Date;

  @BeforeInsert()
  generateId() {
    this.id = uuidv7();
  }
}
