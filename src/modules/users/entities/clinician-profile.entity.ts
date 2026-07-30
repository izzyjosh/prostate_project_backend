// entities/clinician-profile.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum ClinicianStatus {
  PENDING = 'pending', // awaiting admin approval
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('clinician_profiles')
export class ClinicianProfile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'first_name', length: 100 })
  firstName!: string;

  @Column({ name: 'last_name', length: 100 })
  lastName!: string;

  @Column({ name: 'license_number', unique: true })
  licenseNumber!: string; // MDCN registration number in Nigeria

  @Column({ nullable: true })
  specialty!: string; // Urology, Oncology, General Practice

  @Column({ name: 'hospital_affiliation', nullable: true })
  hospitalAffiliation!: string;

  @Column({
    type: 'enum',
    enum: ClinicianStatus,
    default: ClinicianStatus.PENDING,
  })
  status!: ClinicianStatus;

  @Column({ name: 'approved_by', nullable: true })
  approvedBy!: string; // admin user_id who approved

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt!: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
