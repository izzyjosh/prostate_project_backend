import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  ManyToMany,
  JoinTable,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { MedicalCondition } from './medical-condition.entity';

export enum BloodGroup {
  A_POS = 'A+',
  A_NEG = 'A-',
  B_POS = 'B+',
  B_NEG = 'B-',
  AB_POS = 'AB+',
  AB_NEG = 'AB-',
  O_POS = 'O+',
  O_NEG = 'O-',
}

@Entity('medical_backgrounds')
export class MedicalBackground {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToOne(() => User, (user) => user.medicalBackground, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ nullable: true, length: 100 })
  occupation!: string;

  @Column({
    type: 'enum',
    enum: BloodGroup,
    nullable: true,
    name: 'blood_group',
  })
  bloodGroup!: BloodGroup;

  @ManyToMany(() => MedicalCondition)
  @JoinTable({
    name: 'patient_medical_conditions',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'condition_id', referencedColumnName: 'id' },
  })
  conditions!: MedicalCondition[];

  @Column({ type: 'text', nullable: true, name: 'other_conditions_note' })
  otherConditionsNote!: string;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
