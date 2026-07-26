import {
  Body,
  Controller,
  HttpCode,
  Post,
  Query,
  Get,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import type { Response } from 'express';
import { LoginDto } from './dto/login.dto';
import { ResendEmail } from './dto/verify-email.dto';
import { env } from '../../config/env';
import { setAuthCookies } from './utils/cookie.util';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @ApiOperation({ summary: 'Register a new user' })
  @HttpCode(HttpStatus.CREATED)
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto.email, dto.password);
  }

  @Public()
  @ApiOperation({ summary: 'Verify email' })
  @HttpCode(HttpStatus.OK)
  @Get('verify-email')
  async verifyEmail(@Query('token') token: string, @Res() res: Response) {
    const result = await this.authService.verifyEmail(token);
    setAuthCookies(res, result.tokens);
    return res.redirect(302, env.FRONTEND_URL);
  }

  @Public()
  @ApiOperation({ summary: 'Login user' })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.login(dto.email, dto.password, res);
  }

  @Public()
  @ApiOperation({ summary: 'Logout user' })
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    return this.authService.logout(res);
  }

  @Public()
  @ApiOperation({ summary: 'Resend verification email' })
  @HttpCode(HttpStatus.OK)
  @Post('resend-verification-email')
  async resendVerificationEmail(@Body() dto: ResendEmail) {
    return this.authService.resendVerificationEmail(dto.email);
  }
}
