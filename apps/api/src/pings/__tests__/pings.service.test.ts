import { Test } from '@nestjs/testing';

import { PrismaService } from '../../prisma/prisma.service';
import { PingsService } from '../pings.service';

// `@repo/db` builds a real PrismaClient at import time and throws without DATABASE_URL.
vi.mock('@repo/db', () => ({ db: {} }));

const PING_FIELDS = { id: true, note: true, createdAt: true };

const createService = async () => {
  const ping = {
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({ id: 'png_1', note: 'hi', createdAt: new Date(0) }),
  };

  const moduleRef = await Test.createTestingModule({
    providers: [PingsService, { provide: PrismaService, useValue: { ping } }],
  }).compile();

  return { service: moduleRef.get(PingsService), ping };
};

describe('PingsService', () => {
  it('returns the newest pings first, capped at 20 by default', async () => {
    const { service, ping } = await createService();

    await service.listPings();

    expect(ping.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: PING_FIELDS,
    });
  });

  it('honours an explicit limit', async () => {
    const { service, ping } = await createService();

    await service.listPings({ limit: 5 });

    expect(ping.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 5 }));
  });

  it('writes only the note and selects nothing beyond the wire fields', async () => {
    const { service, ping } = await createService();

    const created = await service.createPing({ input: { note: 'hi' } });

    expect(ping.create).toHaveBeenCalledWith({ data: { note: 'hi' }, select: PING_FIELDS });
    expect(created).toEqual({ id: 'png_1', note: 'hi', createdAt: new Date(0) });
  });
});
