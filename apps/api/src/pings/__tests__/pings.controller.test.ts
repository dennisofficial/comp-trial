import { Test } from '@nestjs/testing';

import { PingsController } from '../pings.controller';
import { PingsService } from '../pings.service';

// `@repo/db` builds a real PrismaClient at import time and throws without DATABASE_URL.
vi.mock('@repo/db', () => ({ db: {} }));

const record = { id: 'png_1', note: 'hello', createdAt: new Date('2026-08-04T12:00:00.000Z') };

const createController = async () => {
  const pingsService = {
    listPings: vi.fn().mockResolvedValue([record]),
    createPing: vi.fn().mockResolvedValue(record),
  };

  const moduleRef = await Test.createTestingModule({
    controllers: [PingsController],
    providers: [{ provide: PingsService, useValue: pingsService }],
  }).compile();

  return { controller: moduleRef.get(PingsController), pingsService };
};

describe('PingsController', () => {
  it('wraps the list in a data envelope with ISO dates', async () => {
    const { controller } = await createController();

    await expect(controller.list()).resolves.toEqual({
      data: [{ id: 'png_1', note: 'hello', createdAt: '2026-08-04T12:00:00.000Z' }],
    });
  });

  it('passes the validated note through and returns the created ping', async () => {
    const { controller, pingsService } = await createController();

    const response = await controller.create({ note: 'hello' });

    expect(pingsService.createPing).toHaveBeenCalledWith({ input: { note: 'hello' } });
    expect(response.data.createdAt).toBe('2026-08-04T12:00:00.000Z');
  });
});
