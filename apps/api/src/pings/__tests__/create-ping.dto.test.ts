import { BadRequestException, ValidationPipe, type ArgumentMetadata } from '@nestjs/common';

import { VALIDATION_PIPE_OPTIONS } from '../../app.config';
import { CreatePingDto } from '../dto/create-ping.dto';

const pipe = new ValidationPipe(VALIDATION_PIPE_OPTIONS);

const metadata: ArgumentMetadata = { type: 'body', metatype: CreatePingDto };

const transform = (body: unknown): Promise<CreatePingDto> =>
  pipe.transform(body, metadata) as Promise<CreatePingDto>;

describe('CreatePingDto through the global ValidationPipe', () => {
  it('trims before length checks, matching the Zod schema in apps/web', async () => {
    await expect(transform({ note: '  hello  ' })).resolves.toEqual({ note: 'hello' });
  });

  it('rejects a note that is only whitespace', async () => {
    await expect(transform({ note: '   ' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts exactly 280 characters and rejects 281', async () => {
    await expect(transform({ note: 'a'.repeat(280) })).resolves.toBeInstanceOf(CreatePingDto);
    await expect(transform({ note: 'a'.repeat(281) })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a non-string note rather than coercing it', async () => {
    await expect(transform({ note: 42 })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects unknown properties instead of silently dropping them', async () => {
    await expect(transform({ note: 'hello', isAdmin: true })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
