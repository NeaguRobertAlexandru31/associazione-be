import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateMyMemberDto {
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() addressStreet?: string;
  @IsOptional() @IsString() @MaxLength(5) addressZip?: string;
  @IsOptional() @IsString() addressCity?: string;
  @IsOptional() @IsString() @MaxLength(2) addressProvince?: string;
  @IsOptional() @IsBoolean() privacyNewsletter?: boolean;
  @IsOptional() @IsBoolean() privacyThirdParties?: boolean;
}
