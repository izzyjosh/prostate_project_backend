import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum AssessmentStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
}

@Entity('patient_assessments')
@Index(['user', 'createdAt'])
export class PatientAssessment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'patient_name', length: 255 })
  patientName!: string;

  @Column({ name: 'score', type: 'int' })
  score!: number;

  @Column({ name: 'max_score', type: 'int' })
  maxScore!: number;

  @Column({ name: 'percentage', type: 'int' })
  percentage!: number;

  @Column({ name: 'tier_key', length: 20 })
  tierKey!: string;

  @Column({ name: 'tier_label', length: 50 })
  tierLabel!: string;

  @Column({ name: 'tier_icon', length: 10 })
  tierIcon!: string;

  @Column({ name: 'tier_summary', type: 'text' })
  tierSummary!: string;

  @Column({ name: 'tier_recommendation', type: 'text' })
  tierRecommendation!: string;

  @Column({ name: 'tier_urgency', length: 120 })
  tierUrgency!: string;

  @Column({ name: 'automatic_recommendation', type: 'text', nullable: true })
  automaticRecommendation!: string | null;

  @Column({ name: 'selected_ids', type: 'simple-array' })
  selectedIds!: string[];

  @Column({ type: 'simple-json', nullable: true })
  breakdown!: Record<string, number>;

  @Column({
    type: 'enum',
    enum: AssessmentStatus,
    default: AssessmentStatus.CONFIRMED,
  })
  status!: AssessmentStatus;

  @Column({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
