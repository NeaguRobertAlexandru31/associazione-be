import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CognitoStrategy extends PassportStrategy(Strategy, 'cognito') {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async validate(req: Request): Promise<{ id: string; email: string; role: string }> {
    const authHeader = req.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) throw new UnauthorizedException();

    const token = authHeader.slice(7);
    const region = process.env.COGNITO_REGION!;
    const userPoolId = process.env.COGNITO_USER_POOL_ID!;

    const { createRemoteJWKSet, jwtVerify } = await import('jose');

    const jwks = createRemoteJWKSet(
      new URL(`https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`),
    );

    const { payload } = await jwtVerify(token, jwks, {
      issuer: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`,
      algorithms: ['RS256'],
    }).catch(() => { throw new UnauthorizedException(); });

    const sub = payload.sub as string;

    const member = await this.prisma.member.findUnique({
      where: { cognitoSub: sub, deletedAt: null },
      select: { id: true, email: true, role: true },
    });
    if (!member) throw new UnauthorizedException();

    return { id: member.id, email: member.email, role: member.role };
  }
}
