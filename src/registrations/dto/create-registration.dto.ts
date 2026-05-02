import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export enum MemberCategory {
  ordinario  = 'ordinario',
  under26    = 'under26',
  sostenitore = 'sostenitore',
}

export enum MemberGender {
  m     = 'm',
  f     = 'f',
  altro = 'altro',
}

export enum DocType {
  ci          = 'ci',
  passaporto  = 'passaporto',
  patente     = 'patente',
}

export enum PaymentMethod {
  online   = 'online',
  contanti = 'contanti',
}

export enum GuardianRelation {
  genitore      = 'genitore',
  tutore_legale = 'tutore_legale',
}

const FISCAL_CODE_REGEX = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/i;

export class GuardianDto {
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @IsNotEmpty()
  @IsString()
  lastName: string;

  @IsNotEmpty()
  @Matches(FISCAL_CODE_REGEX, { message: 'Codice fiscale del tutore non valido' })
  fiscalCode: string;

  @IsEnum(GuardianRelation)
  relation: GuardianRelation;

  @IsEnum(DocType)
  docType: DocType;

  @IsNotEmpty()
  @IsString()
  docNumber: string;

  @IsDateString()
  docExpiry: string;
}

export class CreateRegistrationDto {
  @IsBoolean()
  isMinor: boolean;

  @IsEnum(MemberCategory)
  category: MemberCategory;

  @IsNotEmpty()
  @IsString()
  firstName: string;

  @IsNotEmpty()
  @IsString()
  lastName: string;

  @IsNotEmpty()
  @Matches(FISCAL_CODE_REGEX, { message: 'Codice fiscale non valido' })
  fiscalCode: string;

  @IsDateString()
  birthDate: string;

  @IsNotEmpty()
  @IsString()
  birthPlace: string;

  @IsEnum(MemberGender)
  gender: MemberGender;

  @IsEnum(DocType)
  docType: DocType;

  @IsNotEmpty()
  @IsString()
  docNumber: string;

  @IsDateString()
  docExpiry: string;

  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  phone: string;

  @IsNotEmpty()
  @IsString()
  addressStreet: string;

  @IsNotEmpty()
  @IsString()
  addressZip: string;

  @IsNotEmpty()
  @IsString()
  addressCity: string;

  @IsNotEmpty()
  @IsString()
  addressProvince: string;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsBoolean()
  privacyBase: boolean;

  @IsOptional()
  @IsBoolean()
  privacyNewsletter?: boolean;

  @IsOptional()
  @IsBoolean()
  privacyThirdParties?: boolean;

  @ValidateIf(o => o.isMinor === true)
  @ValidateNested()
  @Type(() => GuardianDto)
  guardian?: GuardianDto;
}
