import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export enum ReviewUrgency {
  ROUTINE = 'Routine',
  PRIORITY = 'Priority',
  URGENT = 'Urgent',
}

export class ReviewAssessmentDto {
  @IsString()
  @MaxLength(255)
  diagnosis!: string;

  @IsOptional()
  @IsString()
  prescription?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  followupDate?: string;

  @IsEnum(ReviewUrgency)
  urgency!: ReviewUrgency;
}
