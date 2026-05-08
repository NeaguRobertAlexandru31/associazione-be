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
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterWithTokenDto } from './dto/register-with-token.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const admin = await this.prisma.adminUser.findUnique({
      where: { email: dto.email },
    });

    if (!admin) throw new UnauthorizedException('Credenziali non valide');

    const valid = await bcrypt.compare(dto.password, admin.passwordHash);
    if (!valid) throw new UnauthorizedException('Credenziali non valide');

    return { access_token: this.sign(admin), admin: this.toPublic(admin) };
  }

  async createInvite(adminId: string, role: AdminRole) {
    if (role !== AdminRole.SUPERADMIN) {
      throw new ForbiddenException('Solo il superadmin può generare inviti');
    }

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const invite = await this.prisma.adminInvite.create({
      data: { createdById: adminId, expiresAt },
    });

    return { token: invite.token };
  }

  async checkMember(email: string): Promise<{ isMember: boolean; name?: string }> {
    const member = await this.prisma.member.findFirst({
      where: { email, status: { not: MemberStatus.rifiutato } },
      select: { firstName: true, lastName: true },
    });
    if (!member) return { isMember: false };
    return { isMember: true, name: `${member.firstName} ${member.lastName}` };
  }

  async registerWithToken(dto: RegisterWithTokenDto) {
    const invite = await this.prisma.adminInvite.findUnique({
      where: { token: dto.token },
    });

    if (!invite) throw new NotFoundException('Link di invito non valido');
    if (invite.usedAt) throw new GoneException('Link di invito già utilizzato');
    if (invite.expiresAt < new Date()) throw new GoneException('Link di invito scaduto');

    const isMember = await this.prisma.member.findFirst({
      where: { email: dto.email, status: { not: MemberStatus.rifiutato } },
    });
    if (!isMember) throw new BadRequestException('Per accedere al pannello devi prima registrarti come socio');

    const existing = await this.prisma.adminUser.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email già in uso');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const [admin] = await this.prisma.$transaction([
      this.prisma.adminUser.create({
        data: { name: dto.name, email: dto.email, passwordHash, role: AdminRole.ADMIN },
      }),
      this.prisma.adminInvite.update({
        where: { token: dto.token },
        data: { usedAt: new Date() },
      }),
    ]);

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
    if (dto.name)     data['name']         = dto.name;
    if (dto.email)    data['email']        = dto.email;
    if (dto.password) data['passwordHash'] = await bcrypt.hash(dto.password, 10);

    const updated = await this.prisma.adminUser.update({ where: { id }, data });
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

  private sign(admin: { id: string; email: string; name: string; role: AdminRole }) {
    return this.jwtService.sign({
      sub: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    });
  }

  private toPublic(admin: { id: string; name: string; email: string; role: AdminRole }) {
    return { id: admin.id, name: admin.name, email: admin.email, role: admin.role };
  }
}
