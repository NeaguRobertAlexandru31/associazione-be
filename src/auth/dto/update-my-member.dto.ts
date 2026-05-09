import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { DocType, MemberGender } from '@prisma/client';

export class UpdateMyMemberDto {
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsString() fiscalCode?: string;
  @IsOptional() @IsString() birthDate?: string;
  @IsOptional() @IsString() birthPlace?: string;
  @IsOptional() @IsEnum(MemberGender) gender?: MemberGender;
  @IsOptional() @IsEnum(DocType) docType?: DocType;
  @IsOptional() @IsString() docNumber?: string;
  @IsOptional() @IsString() docExpiry?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() addressStreet?: string;
  @IsOptional() @IsString() @MaxLength(5) addressZip?: string;
  @IsOptional() @IsString() addressCity?: string;
  @IsOptional() @IsString() @MaxLength(2) addressProvince?: string;
  @IsOptional() @IsBoolean() privacyNewsletter?: boolean;
  @IsOptional() @IsBoolean() privacyThirdParties?: boolean;
}
