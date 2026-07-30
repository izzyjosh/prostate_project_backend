import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('medical_conditions')
export class MedicalCondition {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  name!: string; // Hypertension, Diabetes, ...
}
