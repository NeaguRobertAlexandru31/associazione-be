import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRegistrationDto, MemberCategory, PaymentMethod } from './dto/create-registration.dto';

@Injectable()
export class RegistrationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRegistrationDto) {
    const now = new Date();
    const membershipYear = now.getFullYear();

    // privacy_base obbligatorio
    if (!dto.privacyBase) {
      throw new BadRequestException('Il consenso privacy base è obbligatorio');
    }

    // guardian obbligatorio se minorenne
    if (dto.isMinor && !dto.guardian) {
      throw new BadRequestException('Il tutore è obbligatorio per i minorenni');
    }

    // doc_expiry futura
    if (new Date(dto.docExpiry) <= now) {
      throw new BadRequestException('Il documento è scaduto');
    }
    if (dto.guardian && new Date(dto.guardian.docExpiry) <= now) {
      throw new BadRequestException('Il documento del tutore è scaduto');
    }

    // validazione under26
    if (dto.category === MemberCategory.under26) {
      const birth = new Date(dto.birthDate);
      const age = this.calcAge(birth, now);
      if (age >= 26) {
        throw new UnprocessableEntityException(
          'La categoria under26 richiede un\'età inferiore a 26 anni',
        );
      }
    }

    // stessa iscrizione attiva (stesso CF, stesso anno, status non rifiutato)
    const duplicate = await this.prisma.member.findFirst({
      where: {
        fiscalCode: dto.fiscalCode.toUpperCase(),
        membershipYear,
        status: { not: 'rifiutato' },
      },
    });
    if (duplicate) {
      throw new ConflictException(
        `Esiste già un'iscrizione attiva per questo codice fiscale nell'anno ${membershipYear}`,
      );
    }

    const status =
      dto.paymentMethod === PaymentMethod.contanti
        ? 'in_attesa_pagamento'
        : 'pagamento_in_corso';

    const member = await this.prisma.member.create({
      data: {
        isMinor:             dto.isMinor,
        category:            dto.category,
        firstName:           dto.firstName,
        lastName:            dto.lastName,
        fiscalCode:          dto.fiscalCode.toUpperCase(),
        birthDate:           new Date(dto.birthDate),
        birthPlace:          dto.birthPlace,
        gender:              dto.gender,
        docType:             dto.docType,
        docNumber:           dto.docNumber,
        docExpiry:           new Date(dto.docExpiry),
        email:               dto.email,
        phone:               dto.phone,
        addressStreet:       dto.addressStreet,
        addressZip:          dto.addressZip,
        addressCity:         dto.addressCity,
        addressProvince:     dto.addressProvince,
        status,
        membershipYear,
        paymentMethod:       dto.paymentMethod,
        privacyBase:         dto.privacyBase,
        privacyNewsletter:   dto.privacyNewsletter  ?? false,
        privacyThirdParties: dto.privacyThirdParties ?? false,
        ...(dto.guardian && {
          guardian: {
            create: {
              firstName:  dto.guardian.firstName,
              lastName:   dto.guardian.lastName,
              fiscalCode: dto.guardian.fiscalCode.toUpperCase(),
              relation:   dto.guardian.relation,
              docType:    dto.guardian.docType,
              docNumber:  dto.guardian.docNumber,
              docExpiry:  new Date(dto.guardian.docExpiry),
            },
          },
        }),
      },
      include: { guardian: true },
    });

    const response: Record<string, unknown> = {
      id:            member.id,
      status:        member.status,
      membershipYear: member.membershipYear,
    };

    if (dto.paymentMethod === PaymentMethod.online) {
      response.payment_url = `https://pay.placeholder.com/checkout?ref=${member.id}`;
    }

    return response;
  }

  private calcAge(birth: Date, now: Date): number {
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
    return age;
  }
}
