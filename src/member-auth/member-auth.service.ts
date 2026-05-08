import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MemberStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateMemberMeDto } from './dto/update-member-me.dto';

@Injectable()
export class MemberAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async checkEmail(email: string): Promise<{ exists: boolean; hasPassword: boolean }> {
    const member = await this.prisma.member.findFirst({
      where: { email, deletedAt: null, status: { not: MemberStatus.rifiutato } },
      select: { passwordHash: true },
    });
    if (!member) return { exists: false, hasPassword: false };
    return { exists: true, hasPassword: !!member.passwordHash };
  }

  async setPassword(email: string, password: string) {
    const member = await this.prisma.member.findFirst({
      where: { email, deletedAt: null, status: { not: MemberStatus.rifiutato } },
    });
    if (!member) throw new NotFoundException('Email non trovata');
    if (member.passwordHash) throw new BadRequestException('Password già impostata, utilizza il login');

    const hash = await bcrypt.hash(password, 10);
    const updated = await this.prisma.member.update({
      where: { id: member.id },
      data: { passwordHash: hash },
    });
    return { access_token: this.sign(updated) };
  }

  async login(email: string, password: string) {
    const member = await this.prisma.member.findFirst({
      where: { email, deletedAt: null, status: { not: MemberStatus.rifiutato } },
    });
    if (!member || !member.passwordHash)
      throw new UnauthorizedException('Credenziali non valide');

    const valid = await bcrypt.compare(password, member.passwordHash);
    if (!valid) throw new UnauthorizedException('Credenziali non valide');

    return { access_token: this.sign(member) };
  }

  async getMe(memberId: string) {
    const member = await this.prisma.member.findUnique({ where: { id: memberId } });
    if (!member || member.deletedAt) throw new NotFoundException('Socio non trovato');
    const { passwordHash: _, ...rest } = member as any;
    return rest;
  }

  async updateMe(memberId: string, dto: UpdateMemberMeDto) {
    const member = await this.prisma.member.findUnique({ where: { id: memberId } });
    if (!member || member.deletedAt) throw new NotFoundException('Socio non trovato');

    const data: Record<string, unknown> = { ...dto };
    if (dto.birthDate) data['birthDate'] = new Date(dto.birthDate);
    if (dto.docExpiry)  data['docExpiry']  = new Date(dto.docExpiry);

    const updated = await this.prisma.member.update({ where: { id: memberId }, data });
    const { passwordHash: _, ...rest } = updated as any;
    return rest;
  }

  async deleteMe(memberId: string) {
    const member = await this.prisma.member.findUnique({ where: { id: memberId } });
    if (!member || member.deletedAt) throw new NotFoundException('Socio non trovato');
    await this.prisma.member.update({
      where: { id: memberId },
      data: { deletedAt: new Date() },
    });
  }

  private sign(member: { id: string; email: string }) {
    return this.jwtService.sign({
      sub: member.id,
      email: member.email,
      type: 'member',
    });
  }
}
