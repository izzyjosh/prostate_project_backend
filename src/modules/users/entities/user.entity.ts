import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
  OneToOne,
} from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { PatientProfile } from './patient-profile.entity';
import { MedicalBackground } from './medical-background.entity';
import { ClinicianProfile } from './clinician-profile.entity';

export enum Provider {
  EMAIL = 'email',
  GOOGLE = 'google',
}

export enum UserRole {
  PATIENT = 'patient',
  CLINICIAN = 'clinician',
  ADMIN = 'admin',
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

  @Column({ type: 'enum', enum: UserRole, default: UserRole.PATIENT })
  role!: UserRole;

  @OneToOne(() => PatientProfile, (profile) => profile.user, { cascade: true })
  profile!: PatientProfile;

  @OneToOne(() => MedicalBackground, (mb) => mb.user, { cascade: true })
  medicalBackground!: MedicalBackground;

  @OneToOne(() => ClinicianProfile, (cp) => cp.user, { cascade: true })
  clinicianProfile!: ClinicianProfile;

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
