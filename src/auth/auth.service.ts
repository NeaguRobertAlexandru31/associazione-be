import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../encryption/encryption.service';
import { LoginDto } from './dto/login.dto';
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
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  };
}

const PUBLIC_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  profileImage: true,
  boardRoles: true,
  pagePermissions: true,
} as const;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly enc: EncryptionService,
  ) {}

  async login(dto: LoginDto, res: Response) {
    const member = await this.prisma.member.findFirst({
      where: { email: dto.email, deletedAt: null },
    });
    if (!member || !member.passwordHash)
      throw new UnauthorizedException('Credenziali non valide');

    const valid = await bcrypt.compare(dto.password, member.passwordHash);
    if (!valid) throw new UnauthorizedException('Credenziali non valide');

    res.cookie(REFRESH_COOKIE, this.signRefresh(member), refreshCookieOptions());
    return { access_token: this.sign(member), user: this.toPublic(member) };
  }

  async refresh(refreshToken: string | undefined) {
    if (!refreshToken) throw new UnauthorizedException('Refresh token mancante');
    let payload: { sub: string; email: string; role: UserRole };
    try {
      payload = this.jwtService.verify(refreshToken, { secret: REFRESH_SECRET() });
    } catch {
      throw new UnauthorizedException('Refresh token non valido o scaduto');
    }
    const member = await this.prisma.member.findUnique({
      where: { id: payload.sub, deletedAt: null },
    });
    if (!member) throw new UnauthorizedException('Utente non trovato');
    return { access_token: this.sign(member) };
  }

  clearRefreshCookie(res: Response) {
    res.clearCookie(REFRESH_COOKIE, {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: IS_PROD ? 'none' : 'lax',
      path: '/',
    });
  }

  async getProfile(id: string) {
    const member = await this.prisma.member.findUnique({
      where: { id, deletedAt: null },
      select: PUBLIC_SELECT,
    });
    if (!member) throw new NotFoundException('Utente non trovato');
    return member;
  }

  async updateProfile(id: string, dto: UpdateProfileDto) {
    const member = await this.prisma.member.findUnique({ where: { id, deletedAt: null } });
    if (!member) throw new NotFoundException('Utente non trovato');

    if (dto.password) {
      if (!dto.currentPassword)
        throw new BadRequestException('Inserisci la password attuale per cambiarla');
      const valid = await bcrypt.compare(dto.currentPassword, member.passwordHash ?? '');
      if (!valid) throw new UnauthorizedException('Password attuale non corretta');
    }

    if (dto.email && dto.email !== member.email) {
      const existing = await this.prisma.member.findFirst({
        where: { email: dto.email, deletedAt: null },
      });
      if (existing) throw new ConflictException('Email già in uso');
    }

    const data: Record<string, unknown> = {};
    if (dto.email)    data['email']        = dto.email;
    if (dto.password) data['passwordHash'] = await bcrypt.hash(dto.password, 10);

    const updated = await this.prisma.member.update({ where: { id }, data, select: PUBLIC_SELECT });
    return { access_token: this.sign(updated as any), user: updated };
  }

  async deleteProfile(id: string, currentPassword: string) {
    const member = await this.prisma.member.findUnique({ where: { id, deletedAt: null } });
    if (!member) throw new NotFoundException('Utente non trovato');

    const valid = await bcrypt.compare(currentPassword, member.passwordHash ?? '');
    if (!valid) throw new UnauthorizedException('Password non corretta');

    if (member.role === UserRole.SUPERADMIN) {
      const count = await this.prisma.member.count({
        where: { role: UserRole.SUPERADMIN, deletedAt: null },
      });
      if (count <= 1)
        throw new ForbiddenException('Non puoi eliminare l\'unico Presidente');
    }

    await this.prisma.member.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  // ── Profilo anagrafico (area personale) ─────────────────────────────────

  async getMyMember(id: string) {
    const member = await this.prisma.member.findUnique({
      where: { id, deletedAt: null },
      include: { guardian: true },
    });
    if (!member) throw new NotFoundException();
    const { passwordHash: _, fiscalCodeHash: __, ...rest } = member as any;
    const decrypted = this.enc.decryptMember(rest);
    if (decrypted.guardian) {
      const { fiscalCodeHash: _gh, ...gRest } = decrypted.guardian as any;
      decrypted.guardian = this.enc.decryptGuardian(gRest);
    }
    return decrypted;
  }

  async updateMyMember(id: string, dto: UpdateMyMemberDto) {
    const member = await this.prisma.member.findUnique({ where: { id, deletedAt: null } });
    if (!member) throw new NotFoundException();

    const raw: Record<string, unknown> = { ...dto };
    if (dto.birthDate) raw['birthDate'] = new Date(dto.birthDate);
    if (dto.docExpiry) raw['docExpiry'] = new Date(dto.docExpiry);
    if (dto.email && dto.email !== member.email) {
      const conflict = await this.prisma.member.findFirst({
        where: { email: dto.email, deletedAt: null, id: { not: id } },
      });
      if (conflict) throw new ConflictException('Email già in uso');
    }

    const data = this.enc.encryptMember(raw);
    const updated = await this.prisma.member.update({
      where: { id },
      data,
      include: { guardian: true },
    });

    const { passwordHash: _, fiscalCodeHash: __, ...rest } = updated as any;
    const decrypted = this.enc.decryptMember(rest);
    if (decrypted.guardian) {
      const { fiscalCodeHash: _gh, ...gRest } = decrypted.guardian as any;
      decrypted.guardian = this.enc.decryptGuardian(gRest);
    }
    return decrypted;
  }

  // ── Promozione ruolo (solo SUPERADMIN) ───────────────────────────────────

  async promoteRole(requestingId: string, targetId: string, role: UserRole, boardRoles: string[]) {
    const requester = await this.prisma.member.findUnique({ where: { id: requestingId } });
    if (!requester || requester.role !== UserRole.SUPERADMIN)
      throw new ForbiddenException('Solo il presidente può modificare i ruoli');

    if (requestingId === targetId)
      throw new BadRequestException('Non puoi modificare il tuo stesso ruolo');

    const target = await this.prisma.member.findUnique({
      where: { id: targetId, deletedAt: null },
    });
    if (!target) throw new NotFoundException('Membro non trovato');

    if (target.role === UserRole.SUPERADMIN && role !== UserRole.SUPERADMIN) {
      const count = await this.prisma.member.count({
        where: { role: UserRole.SUPERADMIN, deletedAt: null },
      });
      if (count <= 1)
        throw new ForbiddenException('Non puoi retrocedere l\'unico Presidente');
    }

    return this.prisma.member.update({
      where: { id: targetId },
      data: {
        role,
        boardRoles: role === UserRole.MEMBER ? [] : boardRoles,
        ...(role !== UserRole.MEMBER && { status: 'attivo' }),
      },
      select: PUBLIC_SELECT,
    });
  }

  // ── Permessi pagine (solo SUPERADMIN) ───────────────────────────────────

  async updatePermissions(requestingId: string, targetId: string, pagePermissions: Record<string, boolean>) {
    const requester = await this.prisma.member.findUnique({ where: { id: requestingId } });
    if (!requester || requester.role !== UserRole.SUPERADMIN)
      throw new ForbiddenException('Solo il presidente può modificare i permessi');

    const target = await this.prisma.member.findUnique({ where: { id: targetId, deletedAt: null } });
    if (!target) throw new NotFoundException('Membro non trovato');
    if (target.role === UserRole.SUPERADMIN)
      throw new ForbiddenException('Non puoi modificare i permessi di un altro Presidente');

    return this.prisma.member.update({
      where: { id: targetId },
      data: { pagePermissions },
      select: PUBLIC_SELECT,
    });
  }

  // ── Check email (usato dal flusso "primo accesso") ────────────────────────

  async checkEmail(email: string) {
    const member = await this.prisma.member.findFirst({
      where: { email, deletedAt: null },
      select: { passwordHash: true },
    });
    if (!member) return { exists: false, hasPassword: false };
    return { exists: true, hasPassword: !!member.passwordHash };
  }

  async setPassword(email: string, password: string) {
    const member = await this.prisma.member.findFirst({
      where: { email, deletedAt: null },
    });
    if (!member) throw new NotFoundException('Email non trovata');
    if (member.passwordHash)
      throw new BadRequestException('Password già impostata, utilizza il login');

    const hash = await bcrypt.hash(password, 10);
    const updated = await this.prisma.member.update({
      where: { id: member.id },
      data: { passwordHash: hash },
    });
    return { access_token: this.sign(updated) };
  }

  private sign(member: { id: string; email: string; role: UserRole }) {
    return this.jwtService.sign({ sub: member.id, email: member.email, role: member.role });
  }

  private signRefresh(member: { id: string; email: string; role: UserRole }) {
    return this.jwtService.sign(
      { sub: member.id, email: member.email, role: member.role },
      { expiresIn: '7d', secret: REFRESH_SECRET() },
    );
  }

  private toPublic(member: {
    id: string; email: string; firstName: string; lastName: string;
    role: UserRole; profileImage?: string | null; boardRoles: string[];
    pagePermissions?: unknown;
  }) {
    return {
      id: member.id,
      email: member.email,
      firstName: member.firstName,
      lastName: member.lastName,
      role: member.role,
      profileImage: member.profileImage ?? null,
      boardRoles: member.boardRoles,
      pagePermissions: member.pagePermissions ?? null,
    };
  }
}
