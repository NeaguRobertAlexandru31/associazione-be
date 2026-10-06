import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SubmitScanDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsNotEmpty()
  fileUrl: string;

  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsNotEmpty()
  fileSize: number;
}
