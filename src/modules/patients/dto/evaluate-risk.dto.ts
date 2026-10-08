import { IsArray, IsString } from 'class-validator';

export class EvaluateRiskDto {
  @IsArray()
  @IsString({ each: true })
  selectedIds!: string[];
}
