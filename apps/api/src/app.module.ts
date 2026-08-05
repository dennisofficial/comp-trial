import { Module } from '@nestjs/common';

import { EnvModule } from './config/env/env.module';
import { HealthModule } from './health/health.module';
import { ObservabilityModule } from './observability/observability.module';
import { PingsModule } from './pings/pings.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [EnvModule.forRoot(), ObservabilityModule, PrismaModule, HealthModule, PingsModule],
})
export class AppModule {}
