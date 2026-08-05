import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CreatePingDto } from './dto/create-ping.dto';
import { PingDto, PingListResponseDto, PingResponseDto } from './dto/ping-response.dto';
import { PingsService } from './pings.service';

@ApiTags('pings')
@Controller({ path: 'pings', version: '1' })
export class PingsController {
  constructor(private readonly pingsService: PingsService) {}

  @Get()
  @ApiOperation({ operationId: 'listPings', summary: 'List the most recent pings' })
  @ApiOkResponse({ type: PingListResponseDto })
  async list(): Promise<PingListResponseDto> {
    const pings = await this.pingsService.listPings();

    return { data: pings.map((ping) => PingDto.from(ping)) };
  }

  @Post()
  @ApiOperation({ operationId: 'createPing', summary: 'Record a ping' })
  @ApiCreatedResponse({ type: PingResponseDto })
  @ApiBadRequestResponse({ description: 'The note is missing, blank, or over 280 characters' })
  async create(@Body() dto: CreatePingDto): Promise<PingResponseDto> {
    const ping = await this.pingsService.createPing({ input: dto });

    return { data: PingDto.from(ping) };
  }
}
