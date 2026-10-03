import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';
import { SkipTenantSession } from './common/decorators/tenant-session.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Public()
  getData() {
    return this.appService.getData();
  }

  @Get(['health', 'api/health'])
  @Public()
  @SkipTenantSession()
  getHealth() {
    return {
      status: 'ok',
      service: 'caregiver-agency-api',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
