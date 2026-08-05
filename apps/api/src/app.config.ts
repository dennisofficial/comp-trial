import { VersioningType, type ValidationPipeOptions, type VersioningOptions } from '@nestjs/common';

export const API_VERSIONING: VersioningOptions = {
  type: VersioningType.URI,
  defaultVersion: '1',
};

export const VALIDATION_PIPE_OPTIONS: ValidationPipeOptions = {
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
};
