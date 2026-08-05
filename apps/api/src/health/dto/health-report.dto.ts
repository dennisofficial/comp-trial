import { ApiProperty } from '@nestjs/swagger';

export class HealthReportDto {
  @ApiProperty({ enum: ['ok'] })
  status!: 'ok';

  @ApiProperty({ enum: ['reachable'] })
  database!: 'reachable';
}
