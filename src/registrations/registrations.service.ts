import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../encryption/encryption.service';
import { MailService } from '../mail/mail.service';
import { StripeService } from '../stripe/stripe.service';
import {
  CreateRegistrationDto,
  MemberCategory,
  PaymentMethod,
} from './dto/create-registration.dto';

@Injectable()
export class RegistrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly enc: EncryptionService,
    private readonly mail: MailService,
    private readonly stripe: StripeService,
  ) {}

  async create(dto: CreateRegistrationDto) {
    const now = new Date();
    const membershipYear = now.getFullYear();

    if (!dto.privacyBase) {
      throw new BadRequestException('Il consenso privacy base è obbligatorio');
    }

    if (dto.isMinor && !dto.guardian) {
      throw new BadRequestException('Il tutore è obbligatorio per i minorenni');
    }

    if (new Date(dto.docExpiry) <= now) {
      throw new BadRequestException('Il documento è scaduto');
    }
    if (dto.guardian && new Date(dto.guardian.docExpiry) <= now) {
      throw new BadRequestException('Il documento del tutore è scaduto');
    }

    if (dto.category === MemberCategory.under26) {
      const birth = new Date(dto.birthDate);
      const age = this.calcAge(birth, now);
      if (age >= 26) {
        throw new UnprocessableEntityException(
          "La categoria under26 richiede un'età inferiore a 26 anni",
        );
      }
    }

    const fiscalCodeHash = this.enc.hmac(dto.fiscalCode);
    const duplicate = await this.prisma.member.findFirst({
      where: {
        fiscalCodeHash,
        membershipYear,
        status: { not: 'rifiutato' },
        deletedAt: null,
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
        role: 'MEMBER',
        isMinor: dto.isMinor,
        category: dto.category,
        firstName: dto.firstName,
        lastName: dto.lastName,
        fiscalCode: this.enc.encrypt(dto.fiscalCode.toUpperCase()),
        fiscalCodeHash,
        birthDate: new Date(dto.birthDate),
        birthPlace: this.enc.encrypt(dto.birthPlace),
        gender: dto.gender,
        docType: dto.docType,
        docNumber: this.enc.encrypt(dto.docNumber),
        docExpiry: new Date(dto.docExpiry),
        email: dto.email,
        phone: this.enc.encrypt(dto.phone),
        addressStreet: this.enc.encrypt(dto.addressStreet),
        addressZip: this.enc.encrypt(dto.addressZip),
        addressCity: this.enc.encrypt(dto.addressCity),
        addressProvince: this.enc.encrypt(dto.addressProvince),
        status,
        membershipYear,
        paymentMethod: dto.paymentMethod,
        privacyBase: dto.privacyBase,
        privacyNewsletter: dto.privacyNewsletter ?? false,
        privacyThirdParties: dto.privacyThirdParties ?? false,
        ...(dto.guardian && {
          guardian: {
            create: {
              firstName: dto.guardian.firstName,
              lastName: dto.guardian.lastName,
              fiscalCode: this.enc.encrypt(
                dto.guardian.fiscalCode.toUpperCase(),
              ),
              fiscalCodeHash: this.enc.hmac(dto.guardian.fiscalCode),
              relation: dto.guardian.relation,
              docType: dto.guardian.docType,
              docNumber: this.enc.encrypt(dto.guardian.docNumber),
              docExpiry: new Date(dto.guardian.docExpiry),
            },
          },
        }),
      },
      include: { guardian: true },
    });

    this.mail
      .sendWelcome({
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        category: dto.category,
        year: membershipYear,
      })
      .catch(() => {});

    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
      this.mail
        .sendNewRegistrationAlert({
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email,
          category: dto.category,
          year: membershipYear,
          paymentMethod: dto.paymentMethod,
          adminEmail,
        })
        .catch(() => {});
    }

    const response: Record<string, unknown> = {
      id: member.id,
      status: member.status,
      membershipYear: member.membershipYear,
    };

    if (dto.paymentMethod === PaymentMethod.online) {
      response.payment_url = await this.stripe.createCheckoutSession({
        memberId: member.id,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        category: dto.category,
        year: membershipYear,
      });
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
