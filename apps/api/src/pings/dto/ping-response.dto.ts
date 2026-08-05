import { ApiProperty } from '@nestjs/swagger';

import type { PingRecord } from '../pings.service';

export class PingDto {
  @ApiProperty({ example: 'png_cm3xk1a2b0000' })
  id!: string;

  @ApiProperty({ maxLength: 280, example: 'shipped the API split' })
  note!: string;

  @ApiProperty({ format: 'date-time', example: '2026-08-04T12:00:00.000Z' })
  createdAt!: string;

  // Static, so it carries no `@ApiProperty` metadata and the emitted schema is unchanged.
  static from(record: PingRecord): PingDto {
    return {
      id: record.id,
      note: record.note,
      createdAt: record.createdAt.toISOString(),
    };
  }
}

export class PingResponseDto {
  @ApiProperty({ type: PingDto })
  data!: PingDto;
}

export class PingListResponseDto {
  @ApiProperty({ type: [PingDto] })
  data!: PingDto[];
}
