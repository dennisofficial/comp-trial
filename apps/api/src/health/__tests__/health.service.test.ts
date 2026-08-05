import { ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { PrismaService } from '../../prisma/prisma.service';
import { HealthService } from '../health.service';

// `@repo/db` builds a real PrismaClient at import time and throws without DATABASE_URL.
vi.mock('@repo/db', () => ({ db: {} }));

const createService = async ({ queryRaw }: { queryRaw: () => Promise<unknown> }) => {
  const moduleRef = await Test.createTestingModule({
    providers: [HealthService, { provide: PrismaService, useValue: { $queryRaw: queryRaw } }],
  }).compile();

  return moduleRef.get(HealthService);
};

describe('HealthService', () => {
  it('reports ok when the database answers', async () => {
    const service = await createService({ queryRaw: () => Promise.resolve([{ '?column?': 1 }]) });

    await expect(service.check()).resolves.toEqual({ status: 'ok', database: 'reachable' });
  });

  it('raises 503 rather than a 500 when the database is unreachable', async () => {
    const service = await createService({
      queryRaw: () => Promise.reject(new Error('ECONNREFUSED')),
    });

    await expect(service.check()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
