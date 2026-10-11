import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  InitiateAuthCommandOutput,
  GlobalSignOutCommand,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminGetUserCommand,
  AdminDeleteUserCommand,
  ChangePasswordCommand,
  MessageActionType,
  NotAuthorizedException,
  UserNotFoundException,
} from '@aws-sdk/client-cognito-identity-provider';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../encryption/encryption.service';
import { LoginDto } from './dto/login.dto';
import { UpdateMyMemberDto } from './dto/update-my-member.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

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
  private readonly cognito: CognitoIdentityProviderClient;
  private readonly userPoolId: string;
  private readonly clientId: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly enc: EncryptionService,
  ) {
    this.cognito = new CognitoIdentityProviderClient({
      region: process.env.COGNITO_REGION ?? 'eu-central-1',
    });
    this.userPoolId = process.env.COGNITO_USER_POOL_ID!;
    this.clientId   = process.env.COGNITO_CLIENT_ID!;
  }

  async login(dto: LoginDto) {
    let cognitoRes: InitiateAuthCommandOutput;
    try {
      cognitoRes = await this.cognito.send(new InitiateAuthCommand({
        AuthFlow:         'USER_PASSWORD_AUTH',
        ClientId:         this.clientId,
        AuthParameters: {
          USERNAME: dto.email,
          PASSWORD: dto.password,
        },
      }));
    } catch (err) {
      if (err instanceof NotAuthorizedException || err instanceof UserNotFoundException) {
        throw new UnauthorizedException('Credenziali non valide');
      }
      throw new InternalServerErrorException('Errore di autenticazione');
    }

    const member = await this.prisma.member.findFirst({
      where: { email: dto.email, deletedAt: null, status: { not: 'rifiutato' } },
      select: PUBLIC_SELECT,
    });
    if (!member) throw new UnauthorizedException('Credenziali non valide');

    return {
      access_token:  cognitoRes.AuthenticationResult!.AccessToken,
      refresh_token: cognitoRes.AuthenticationResult!.RefreshToken,
      user:          this.toPublic(member),
    };
  }

  async refresh(refreshToken: string | undefined) {
    if (!refreshToken) throw new UnauthorizedException('Refresh token mancante');
    try {
      const res = await this.cognito.send(new InitiateAuthCommand({
        AuthFlow:       'REFRESH_TOKEN_AUTH',
        ClientId:       this.clientId,
        AuthParameters: { REFRESH_TOKEN: refreshToken },
      }));
      return { access_token: res.AuthenticationResult!.AccessToken };
    } catch {
      throw new UnauthorizedException('Refresh token non valido o scaduto');
    }
  }

  async logout(accessToken: string) {
    try {
      await this.cognito.send(new GlobalSignOutCommand({ AccessToken: accessToken }));
    } catch {
      // ignora errori di logout (token già scaduto, etc.)
    }
  }

  async getProfile(id: string) {
    const member = await this.prisma.member.findUnique({
      where: { id, deletedAt: null },
      select: PUBLIC_SELECT,
    });
    if (!member) throw new NotFoundException('Utente non trovato');
    return member;
  }

  async updateProfile(id: string, dto: UpdateProfileDto, accessToken: string) {
    const member = await this.prisma.member.findUnique({
      where: { id, deletedAt: null },
    });
    if (!member) throw new NotFoundException('Utente non trovato');

    if (dto.password) {
      if (!dto.currentPassword)
        throw new BadRequestException('Inserisci la password attuale per cambiarla');
      try {
        await this.cognito.send(new ChangePasswordCommand({
          AccessToken:      accessToken,
          PreviousPassword: dto.currentPassword,
          ProposedPassword: dto.password,
        }));
      } catch {
        throw new UnauthorizedException('Password attuale non corretta');
      }
    }

    if (dto.email && dto.email !== member.email) {
      const existing = await this.prisma.member.findFirst({
        where: { email: dto.email, deletedAt: null },
      });
      if (existing) throw new ConflictException('Email già in uso');
    }

    const data: Record<string, unknown> = {};
    if (dto.email) data['email'] = dto.email;

    const updated = await this.prisma.member.update({
      where: { id },
      data,
      select: PUBLIC_SELECT,
    });
    return { user: updated };
  }

  async deleteProfile(id: string, accessToken: string) {
    const member = await this.prisma.member.findUnique({
      where: { id, deletedAt: null },
    });
    if (!member) throw new NotFoundException('Utente non trovato');

    if (member.role === UserRole.SUPERADMIN) {
      const count = await this.prisma.member.count({
        where: { role: UserRole.SUPERADMIN, deletedAt: null },
      });
      if (count <= 1)
        throw new ForbiddenException("Non puoi eliminare l'unico Superadmin");
    }

    if (member.cognitoSub) {
      try {
        await this.cognito.send(new AdminDeleteUserCommand({
          UserPoolId: this.userPoolId,
          Username:   member.cognitoSub,
        }));
      } catch {
        // se l'utente non esiste in Cognito, prosegui comunque
      }
    }

    await this.prisma.member.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ── Profilo anagrafico (area personale) ─────────────────────────────────

  async getMyMember(id: string) {
    const member = await this.prisma.member.findUnique({
      where: { id, deletedAt: null },
      include: { guardian: true },
    });
    if (!member) throw new NotFoundException();
    const { passwordHash: _, fiscalCodeHash: __, cognitoSub: ___, ...rest } = member as any;
    const decrypted = this.enc.decryptMember(rest);
    if (decrypted.guardian) {
      const { fiscalCodeHash: _gh, ...gRest } = decrypted.guardian;
      decrypted.guardian = this.enc.decryptGuardian(gRest);
    }
    return decrypted;
  }

  async updateMyMember(id: string, dto: UpdateMyMemberDto) {
    const member = await this.prisma.member.findUnique({
      where: { id, deletedAt: null },
    });
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

    const { passwordHash: _, fiscalCodeHash: __, cognitoSub: ___, ...rest } = updated as any;
    const decrypted = this.enc.decryptMember(rest);
    if (decrypted.guardian) {
      const { fiscalCodeHash: _gh, ...gRest } = decrypted.guardian;
      decrypted.guardian = this.enc.decryptGuardian(gRest);
    }
    return decrypted;
  }

  // ── Check email / primo accesso ──────────────────────────────────────────

  async checkEmail(email: string) {
    const member = await this.prisma.member.findFirst({
      where: { email, deletedAt: null },
      select: { cognitoSub: true },
    });
    if (!member) return { exists: false, hasPassword: false };
    return { exists: true, hasPassword: !!member.cognitoSub };
  }

  async setPassword(email: string, password: string) {
    const member = await this.prisma.member.findFirst({
      where: { email, deletedAt: null },
    });
    if (!member) throw new NotFoundException('Email non trovata');
    if (member.cognitoSub)
      throw new BadRequestException('Password già impostata, utilizza il login');

    // Crea utente in Cognito senza inviare email di invito
    await this.cognito.send(new AdminCreateUserCommand({
      UserPoolId:    this.userPoolId,
      Username:      email,
      MessageAction: MessageActionType.SUPPRESS,
      UserAttributes: [
        { Name: 'email',          Value: email },
        { Name: 'email_verified', Value: 'true' },
      ],
    }));

    // Imposta password permanente (bypassa il flusso FORCE_CHANGE_PASSWORD)
    await this.cognito.send(new AdminSetUserPasswordCommand({
      UserPoolId: this.userPoolId,
      Username:   email,
      Password:   password,
      Permanent:  true,
    }));

    // Recupera il sub Cognito
    const userInfo = await this.cognito.send(new AdminGetUserCommand({
      UserPoolId: this.userPoolId,
      Username:   email,
    }));
    const sub = userInfo.UserAttributes?.find(a => a.Name === 'sub')?.Value;
    if (!sub) throw new InternalServerErrorException('Impossibile recuperare il sub Cognito');

    // Salva cognitoSub nel DB
    await this.prisma.member.update({
      where: { id: member.id },
      data:  { cognitoSub: sub },
    });

    // Login immediato con le credenziali appena impostate
    const loginRes = await this.cognito.send(new InitiateAuthCommand({
      AuthFlow:       'USER_PASSWORD_AUTH',
      ClientId:       this.clientId,
      AuthParameters: { USERNAME: email, PASSWORD: password },
    }));

    return {
      access_token:  loginRes.AuthenticationResult!.AccessToken,
      refresh_token: loginRes.AuthenticationResult!.RefreshToken,
    };
  }

  // ── Tessera ──────────────────────────────────────────────────────────────

  async verifyMember(id: string) {
    const member = await this.prisma.member.findUnique({
      where: { id, deletedAt: null },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        category: true,
        status: true,
        membershipYear: true,
        profileImage: true,
      },
    });
    if (!member) throw new NotFoundException('Tessera non trovata');

    const year   = member.membershipYear ?? new Date().getFullYear();
    const expiry = new Date(`${year}-12-31`);
    const expired = new Date() > expiry;

    return {
      firstName:      member.firstName,
      lastName:       member.lastName,
      category:       member.category,
      status:         member.status,
      membershipYear: year,
      expired,
      profileImage:   member.profileImage,
      cardCode:       `APS Marama · ${year} · ${member.id.slice(-4).toUpperCase()}`,
    };
  }

  async getMyTessera(id: string) {
    const member = await this.prisma.member.findUnique({
      where: { id, deletedAt: null },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        category: true,
        status: true,
        membershipYear: true,
        paymentMethod: true,
        profileImage: true,
      },
    });
    if (!member) throw new NotFoundException('Tessera non trovata');

    const year     = member.membershipYear ?? new Date().getFullYear();
    const expiry   = new Date(`${year}-12-31`);
    const now      = new Date();
    const expired  = now > expiry;
    const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
      id:             member.id,
      firstName:      member.firstName,
      lastName:       member.lastName,
      category:       member.category,
      status:         member.status,
      membershipYear: year,
      expiryDate:     expiry.toISOString(),
      expired,
      daysLeft:       expired ? 0 : daysLeft,
      paymentMethod:  member.paymentMethod,
      profileImage:   member.profileImage,
      cardCode:       `APS Marama · ${year} · ${member.id.slice(-4).toUpperCase()}`,
    };
  }

  // ── Promozione ruolo (solo SUPERADMIN) ───────────────────────────────────

  async promoteRole(requestingId: string, targetId: string, role: UserRole, boardRoles: string[]) {
    const requester = await this.prisma.member.findUnique({ where: { id: requestingId } });
    if (!requester || requester.role !== UserRole.SUPERADMIN)
      throw new ForbiddenException('Solo il superadmin può modificare i ruoli');

    if (requestingId === targetId)
      throw new BadRequestException('Non puoi modificare il tuo stesso ruolo');

    const target = await this.prisma.member.findUnique({ where: { id: targetId, deletedAt: null } });
    if (!target) throw new NotFoundException('Membro non trovato');

    if (target.role === UserRole.SUPERADMIN && role !== UserRole.SUPERADMIN) {
      const count = await this.prisma.member.count({ where: { role: UserRole.SUPERADMIN, deletedAt: null } });
      if (count <= 1)
        throw new ForbiddenException("Non puoi retrocedere l'unico Superadmin");
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
      throw new ForbiddenException('Solo il superadmin può modificare i permessi');

    const target = await this.prisma.member.findUnique({ where: { id: targetId, deletedAt: null } });
    if (!target) throw new NotFoundException('Membro non trovato');
    if (target.role === UserRole.SUPERADMIN)
      throw new ForbiddenException('Non puoi modificare i permessi di un altro Superadmin');

    return this.prisma.member.update({
      where: { id: targetId },
      data: { pagePermissions },
      select: PUBLIC_SELECT,
    });
  }

  private toPublic(member: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    profileImage?: string | null;
    boardRoles: string[];
    pagePermissions?: unknown;
  }) {
    return {
      id:              member.id,
      email:           member.email,
      firstName:       member.firstName,
      lastName:        member.lastName,
      role:            member.role,
      profileImage:    member.profileImage ?? null,
      boardRoles:      member.boardRoles,
      pagePermissions: member.pagePermissions ?? null,
    };
  }
}
