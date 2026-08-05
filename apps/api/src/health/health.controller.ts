import { Controller, Get } from '@nestjs/common';

import { HealthService, type HealthReport } from './health.service';

@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async check(): Promise<HealthReport> {
    return this.healthService.check();
  }
}
