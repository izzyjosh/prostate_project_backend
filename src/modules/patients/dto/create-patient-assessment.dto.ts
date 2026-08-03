import {
  IsArray,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePatientAssessmentDto {
  @IsInt()
  @Min(0)
  score!: number;

  @IsInt()
  @Min(0)
  maxScore!: number;

  @IsInt()
  @Min(0)
  percentage!: number;

  @IsObject()
  tier!: {
    tier: string;
    label: string;
    icon: string;
    summary: string;
    recommendation: string;
    urgency: string;
  };

  @IsObject()
  breakdown!: Record<string, number>;

  @IsArray()
  @IsString({ each: true })
  selectedIds!: string[];

  @IsOptional()
  @IsString()
  timestamp?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  patientName?: string;
}
