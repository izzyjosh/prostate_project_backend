import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  @ApiOperation({ summary: 'Check the health of the application' })
  checkHealth(): Record<string, string> {
    return {
      status: 'ok',
      uptime: process.uptime().toString(),
      timestamp: new Date().toISOString(),
    };
  }
}
