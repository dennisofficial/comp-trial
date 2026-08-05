import { Global, Module, type DynamicModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { EnvService } from './env.service';
import { validateEnv } from './validation';

type TEnvModuleOptions = {
  validate?: boolean;
};

@Global()
@Module({})
export class EnvModule {
  static forRoot({ validate = true }: TEnvModuleOptions = {}): DynamicModule {
    return {
      module: EnvModule,
      imports: [
        ConfigModule.forRoot({
          cache: true,
          isGlobal: true,
          ignoreEnvFile: true,
          validate: validate ? validateEnv : undefined,
        }),
      ],
      providers: [EnvService],
      exports: [EnvService],
    };
  }
}
