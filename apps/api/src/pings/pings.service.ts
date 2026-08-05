import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

export type PingRecord = {
  id: string;
  note: string;
  createdAt: Date;
};

export type PingInput = {
  note: string;
};

const DEFAULT_LIMIT = 20;

const PING_FIELDS = { id: true, note: true, createdAt: true } as const;

@Injectable()
export class PingsService {
  constructor(private readonly prisma: PrismaService) {}

  async listPings({ limit = DEFAULT_LIMIT }: { limit?: number } = {}): Promise<PingRecord[]> {
    return this.prisma.ping.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: PING_FIELDS,
    });
  }

  async createPing({ input }: { input: PingInput }): Promise<PingRecord> {
    return this.prisma.ping.create({
      data: { note: input.note },
      select: PING_FIELDS,
    });
  }
}
