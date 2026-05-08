import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateSocioDto {
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsString() fiscalCode?: string;
  @IsOptional() @IsString() birthDate?: string;
  @IsOptional() @IsString() birthPlace?: string;
  @IsOptional() @IsString() gender?: string;
  @IsOptional() @IsString() docType?: string;
  @IsOptional() @IsString() docNumber?: string;
  @IsOptional() @IsString() docExpiry?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() addressStreet?: string;
  @IsOptional() @IsString() addressZip?: string;
  @IsOptional() @IsString() addressCity?: string;
  @IsOptional() @IsString() addressProvince?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() paymentMethod?: string;
  @IsOptional() @IsBoolean() isMinor?: boolean;
}
