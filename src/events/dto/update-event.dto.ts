import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsDateString,
  Min,
} from 'class-validator';
import { EventAccessType } from './create-event.dto';

export class UpdateEventDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsDateString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  time?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @IsString()
  @IsOptional()
  cover?: string;

  @IsEnum(EventAccessType)
  @IsOptional()
  accessType?: EventAccessType;

  @IsInt()
  @Min(1)
  @IsOptional()
  capacity?: number;
}
