import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { IEnvConfig } from './validation';

@Injectable()
export class EnvService extends ConfigService<IEnvConfig, true> {
  override get<K extends keyof IEnvConfig>(propertyPath: K): IEnvConfig[K] {
    return super.get(propertyPath, { infer: true });
  }
}
