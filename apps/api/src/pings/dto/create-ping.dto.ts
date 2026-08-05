import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreatePingDto {
  @ApiProperty({ minLength: 1, maxLength: 280, example: 'shipped the API split' })
  @IsString()
  @MinLength(1, { message: 'Note is required' })
  @MaxLength(280, { message: 'Keep it under 280 characters' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  note!: string;
}
