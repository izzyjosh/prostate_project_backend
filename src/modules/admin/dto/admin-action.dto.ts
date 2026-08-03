import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAdminSettingDto {
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  value?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}

export class AdminNoteDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}
