import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { EnvService } from './env.service';
import { ENodeEnv, validateEnv } from './validation';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
      ignoreEnvFile: true,
      validate: process.env.NODE_ENV === ENodeEnv.TEST ? undefined : validateEnv,
    }),
  ],
  providers: [EnvService],
  exports: [EnvService],
})
export class EnvModule {}
