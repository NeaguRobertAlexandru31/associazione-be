import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateMemberMeDto {
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsString() @MaxLength(16) fiscalCode?: string;
  @IsOptional() @IsString() birthDate?: string;
  @IsOptional() @IsString() birthPlace?: string;
  @IsOptional() @IsString() gender?: string;
  @IsOptional() @IsString() docType?: string;
  @IsOptional() @IsString() docNumber?: string;
  @IsOptional() @IsString() docExpiry?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() addressStreet?: string;
  @IsOptional() @IsString() @MaxLength(5) addressZip?: string;
  @IsOptional() @IsString() addressCity?: string;
  @IsOptional() @IsString() @MaxLength(2) addressProvince?: string;
  @IsOptional() @IsBoolean() privacyNewsletter?: boolean;
  @IsOptional() @IsBoolean() privacyThirdParties?: boolean;
}
