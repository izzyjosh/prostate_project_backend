import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class VerifyDto {
  @ApiProperty({
    example: 'verification-token',
  })
  @IsString({ message: 'Token must be a string' })
  @IsNotEmpty({ message: 'Token field is required' })
  token!: string;
}

export class ResendEmail {
  @ApiProperty({
    example: 'joshuajosephizzyjosh@gmail.com',
  })
  @IsString({ message: 'Email must be a string' })
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail()
  email!: string;
}
