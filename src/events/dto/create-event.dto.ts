import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
  Min,
} from 'class-validator';

export enum EventAccessType {
  public = 'public',
  limited = 'limited',
  members_only = 'members_only',
}

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsDateString()
  date: string;

  @IsString()
  @IsNotEmpty()
  time: string;

  @IsString()
  @IsNotEmpty()
  location: string;

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
