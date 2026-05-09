import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AdminRole, MemberStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../encryption/encryption.service';
import { LoginDto } from './dto/login.dto';
import { RegisterWithTokenDto } from './dto/register-with-token.dto';
import { UpdateMyMemberDto } from './dto/update-my-member.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

const REFRESH_COOKIE = 'acr_refresh';
const REFRESH_SECRET = () => process.env.JWT_REFRESH_SECRET ?? 'changeme-refresh';
const IS_PROD = process.env.NODE_ENV === 'production';

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: (IS_PROD ? 'none' : 'lax') as 'none' | 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 giorni
    path: '/',
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly enc: EncryptionService,
  ) {}

  async login(dto: LoginDto, res: Response) {
    const admin = await this.prisma.adminUser.findUnique({ where: { email: dto.email } });
    if (!admin) throw new UnauthorizedException('Credenziali non valide');

    const valid = await bcrypt.compare(dto.password, admin.passwordHash);
    if (!valid) throw new UnauthorizedException('Credenziali non valide');

    res.cookie(REFRESH_COOKIE, this.signRefresh(admin), refreshCookieOptions());
    return { access_token: this.sign(admin), admin: this.toPublic(admin) };
  }

  async refresh(refreshToken: string | undefined) {
    if (!refreshToken) throw new UnauthorizedException('Refresh token mancante');
    let payload: { sub: string; email: string; name: string; role: AdminRole };
    try {
      payload = this.jwtService.verify(refreshToken, { secret: REFRESH_SECRET() });
    } catch {
      throw new UnauthorizedException('Refresh token non valido o scaduto');
    }
    const admin = await this.prisma.adminUser.findUnique({ where: { id: payload.sub } });
    if (!admin) throw new UnauthorizedException('Utente non trovato');
    return { access_token: this.sign(admin) };
  }

  clearRefreshCookie(res: Response) {
    res.clearCookie(REFRESH_COOKIE, { httpOnly: true, secure: IS_PROD, sameSite: IS_PROD ? 'none' : 'lax', path: '/' });
  }

  async createInvite(adminId: string, role: AdminRole) {
    if (role !== AdminRole.SUPERADMIN) {
      throw new ForbiddenException('Solo il superadmin può generare inviti');
    }

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const invite = await this.prisma.adminInvite.create({
      data: { createdById: adminId, expiresAt },
    });

    return { token: invite.token };
  }

  // Non restituisce il nome per evitare user enumeration (GDPR)
  async checkMember(email: string): Promise<{ isMember: boolean }> {
    const member = await this.prisma.member.findFirst({
      where: { email, status: { not: MemberStatus.rifiutato }, deletedAt: null },
      select: { id: true },
    });
    return { isMember: !!member };
  }

  async registerWithToken(dto: RegisterWithTokenDto, res: Response) {
    const invite = await this.prisma.adminInvite.findUnique({
      where: { token: dto.token },
    });

    if (!invite) throw new NotFoundException('Link di invito non valido');
    if (invite.usedAt) throw new GoneException('Link di invito già utilizzato');
    if (invite.expiresAt < new Date()) throw new GoneException('Link di invito scaduto');

    const isMember = await this.prisma.member.findFirst({
      where: { email: dto.email, status: { not: MemberStatus.rifiutato }, deletedAt: null },
    });
    if (!isMember) throw new BadRequestException('Per accedere al pannello devi prima registrarti come socio');

    const existing = await this.prisma.adminUser.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email già in uso');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const [admin] = await this.prisma.$transaction([
      this.prisma.adminUser.create({
        data: { name: dto.name, email: dto.email, passwordHash, role: AdminRole.ADMIN, memberId: isMember.id },
      }),
      this.prisma.adminInvite.update({
        where: { token: dto.token },
        data: { usedAt: new Date() },
      }),
    ]);

    res.cookie(REFRESH_COOKIE, this.signRefresh(admin), refreshCookieOptions());
    return { access_token: this.sign(admin), admin: this.toPublic(admin) };
  }

  async getProfile(id: string) {
    const admin = await this.prisma.adminUser.findUnique({ where: { id } });
    if (!admin) throw new NotFoundException('Utente non trovato');
    return this.toPublic(admin);
  }

  async updateProfile(id: string, dto: UpdateProfileDto) {
    const admin = await this.prisma.adminUser.findUnique({ where: { id } });
    if (!admin) throw new NotFoundException('Utente non trovato');

    if (dto.password) {
      if (!dto.currentPassword) throw new BadRequestException('Inserisci la password attuale per cambiarla');
      const valid = await bcrypt.compare(dto.currentPassword, admin.passwordHash);
      if (!valid) throw new UnauthorizedException('Password attuale non corretta');
    }

    if (dto.email && dto.email !== admin.email) {
      const existing = await this.prisma.adminUser.findUnique({ where: { email: dto.email } });
      if (existing) throw new ConflictException('Email già in uso');
    }

    const data: Record<string, unknown> = {};
    if (dto.name)     data['name']        = dto.name;
    if (dto.email)    data['email']        = dto.email;
    if (dto.password) data['passwordHash'] = await bcrypt.hash(dto.password, 10);

    const updated = await this.prisma.adminUser.update({ where: { id }, data });

    if (admin.memberId && (dto.email || dto.name)) {
      const memberData: Record<string, unknown> = {};
      if (dto.email) memberData['email'] = dto.email;
      if (dto.name) {
        const spaceIdx = dto.name.trim().indexOf(' ');
        memberData['firstName'] = spaceIdx >= 0 ? dto.name.trim().slice(0, spaceIdx) : dto.name.trim();
        memberData['lastName']  = spaceIdx >= 0 ? dto.name.trim().slice(spaceIdx + 1) : '';
      }
      await this.prisma.member.update({ where: { id: admin.memberId }, data: memberData });
    }

    return { access_token: this.sign(updated), admin: this.toPublic(updated) };
  }

  async deleteProfile(id: string, currentPassword: string) {
    const admin = await this.prisma.adminUser.findUnique({ where: { id } });
    if (!admin) throw new NotFoundException('Utente non trovato');

    const valid = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!valid) throw new UnauthorizedException('Password non corretta');

    if (admin.role === AdminRole.SUPERADMIN) {
      const count = await this.prisma.adminUser.count({ where: { role: AdminRole.SUPERADMIN } });
      if (count <= 1) throw new ForbiddenException('Non puoi eliminare l\'unico Presidente');
    }

    await this.prisma.adminUser.delete({ where: { id } });
  }

  // ── Area personale socio ──────────────────────────────────────────────────

  async getMyMember(adminId: string) {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: adminId },
      select: { memberId: true, email: true },
    });
    if (!admin) throw new NotFoundException();
    const raw = admin.memberId
      ? await this.prisma.member.findUnique({ where: { id: admin.memberId, deletedAt: null }, include: { guardian: true } })
      : await this.prisma.member.findFirst({ where: { email: admin.email, deletedAt: null }, include: { guardian: true } });
    if (!raw) return null;
    const { passwordHash: _, fiscalCodeHash: __, ...rest } = raw as any;
    const decrypted = this.enc.decryptMember(rest);
    if (decrypted.guardian) {
      const { fiscalCodeHash: _gh, ...gRest } = decrypted.guardian as any;
      decrypted.guardian = this.enc.decryptGuardian(gRest);
    }
    return decrypted;
  }

  async updateMyMember(adminId: string, dto: UpdateMyMemberDto) {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: adminId },
      select: { id: true, memberId: true, email: true },
    });
    if (!admin) throw new NotFoundException();
    const member = admin.memberId
      ? await this.prisma.member.findUnique({ where: { id: admin.memberId, deletedAt: null } })
      : await this.prisma.member.findFirst({ where: { email: admin.email, deletedAt: null } });
    if (!member) throw new NotFoundException('Nessun record socio trovato');

    const raw: Record<string, unknown> = { ...dto };
    if (dto.birthDate) raw['birthDate'] = new Date(dto.birthDate);
    if (dto.docExpiry)  raw['docExpiry']  = new Date(dto.docExpiry);
    const data = this.enc.encryptMember(raw);

    const updated = await this.prisma.member.update({ where: { id: member.id }, data });

    if (dto.firstName || dto.lastName) {
      const first = dto.firstName ?? member.firstName;
      const last  = dto.lastName  ?? member.lastName;
      await this.prisma.adminUser.update({
        where: { id: admin.id },
        data: { name: `${first} ${last}`.trim() },
      });
    }

    const { passwordHash: _, fiscalCodeHash: __, ...rest } = updated as any;
    return this.enc.decryptMember(rest);
  }

  async deleteMyMember(adminId: string) {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: adminId },
      select: { memberId: true, email: true },
    });
    if (!admin) throw new NotFoundException();
    const member = admin.memberId
      ? await this.prisma.member.findUnique({ where: { id: admin.memberId, deletedAt: null } })
      : await this.prisma.member.findFirst({ where: { email: admin.email, deletedAt: null } });
    if (!member) throw new NotFoundException('Nessun record socio trovato');
    await this.prisma.member.update({ where: { id: member.id }, data: { deletedAt: new Date() } });
  }

  async linkMember(adminId: string, memberEmail: string) {
    const member = await this.prisma.member.findFirst({
      where: { email: memberEmail, deletedAt: null },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!member) throw new NotFoundException('Nessun socio trovato con questa email');

    const conflict = await this.prisma.adminUser.findFirst({
      where: { memberId: member.id, id: { not: adminId } },
    });
    if (conflict) throw new BadRequestException('Questo profilo socio è già collegato a un altro account');

    await this.prisma.adminUser.update({
      where: { id: adminId },
      data: { memberId: member.id },
    });
    return { ok: true };
  }

  private sign(admin: { id: string; email: string; name: string; role: AdminRole }) {
    return this.jwtService.sign({ sub: admin.id, email: admin.email, name: admin.name, role: admin.role });
  }

  private signRefresh(admin: { id: string; email: string; name: string; role: AdminRole }) {
    return this.jwtService.sign(
      { sub: admin.id, email: admin.email, name: admin.name, role: admin.role },
      { expiresIn: '7d', secret: REFRESH_SECRET() },
    );
  }

  private toPublic(admin: { id: string; name: string; email: string; role: AdminRole; profileImage?: string | null }) {
    return { id: admin.id, name: admin.name, email: admin.email, role: admin.role, profileImage: admin.profileImage ?? null };
  }
}
