import { Controller, Get } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';

import { HealthReportDto } from './dto/health-report.dto';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ operationId: 'checkHealth', summary: 'Liveness plus a database round-trip' })
  @ApiOkResponse({ type: HealthReportDto })
  @ApiServiceUnavailableResponse({ description: 'The database did not answer' })
  async check(): Promise<HealthReportDto> {
    return this.healthService.check();
  }
}
