import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  IsDateString,
  IsPhoneNumber,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateBy,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { BloodGroup } from '../../users/entities/medical-background.entity';

const isDateOfBirthAtLeast40 = (value: unknown): boolean => {
  if (typeof value !== 'string') return false;

  const dateOfBirth = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(dateOfBirth.getTime())) return false;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  if (dateOfBirth > today) return false;

  const fortiethBirthday = new Date(today);
  fortiethBirthday.setUTCFullYear(today.getUTCFullYear() - 40);

  return dateOfBirth <= fortiethBirthday;
};

const IsDateOfBirthAtLeast40 = () =>
  ValidateBy(
    {
      name: 'isDateOfBirthAtLeast40',
      validator: {
        validate: isDateOfBirthAtLeast40,
      },
    },
    {
      message:
        'Registration is limited to patients who are at least 40 years old',
    },
  );

const IsDateOfBirthNotInFuture = () =>
  ValidateBy(
    {
      name: 'isDateOfBirthNotInFuture',
      validator: {
        validate: (value: unknown): boolean => {
          if (typeof value !== 'string') return false;

          const dateOfBirth = new Date(`${value}T00:00:00Z`);
          const today = new Date();
          today.setUTCHours(0, 0, 0, 0);

          return !Number.isNaN(dateOfBirth.getTime()) && dateOfBirth <= today;
        },
      },
    },
    { message: 'Date of birth cannot be in the future' },
  );

export class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  firstName!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  lastName!: string;

  @IsDateString()
  @IsDateOfBirthNotInFuture()
  @IsDateOfBirthAtLeast40()
  dateOfBirth!: string;

  @IsPhoneNumber('NG')
  phoneNumber!: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  occupation?: string;

  @IsOptional()
  @IsEnum(BloodGroup)
  bloodGroup?: BloodGroup;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  knownConditions?: string[]; // e.g. ["Hypertension", "Diabetes"]

  @ApiProperty({
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Invalid email format' })
  @MaxLength(255, { message: 'Email must be at most 255 characters' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email!: string;

  @ApiProperty({
    example: 'P@ssw0rd!',
  })
  @IsString()
  @MinLength(8)
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message:
      'Password must contain upper, lower case letters and a number or symbol',
  })
  password!: string;
}
