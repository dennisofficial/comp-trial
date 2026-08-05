import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { db } from '@repo/db';

@Injectable()
export class PrismaService implements OnModuleDestroy {
  readonly client = db;

  get ping() {
    return db.ping;
  }

  $queryRaw(...args: Parameters<typeof db.$queryRaw>) {
    return db.$queryRaw(...args);
  }

  async onModuleDestroy(): Promise<void> {
    await db.$disconnect();
  }
}
