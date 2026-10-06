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
import {
  DocType,
  GuardianDto,
  GuardianRelation,
  MemberCategory,
  MemberGender,
  PaymentMethod,
} from '../../registrations/dto/create-registration.dto';

export { GuardianRelation };

const FISCAL_CODE_REGEX = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/i;

export enum MemberStatus {
  in_attesa_pagamento = 'in_attesa_pagamento',
  pagamento_in_corso = 'pagamento_in_corso',
  attivo = 'attivo',
  rifiutato = 'rifiutato',
}

export class CreateMemberDto {
  @IsBoolean()
  isMinor: boolean;

  @IsEnum(MemberCategory)
  category: MemberCategory;

  @IsEnum(MemberStatus)
  status: MemberStatus;

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

  @ValidateIf((o) => o.isMinor === true)
  @ValidateNested()
  @Type(() => GuardianDto)
  guardian?: GuardianDto;
}
