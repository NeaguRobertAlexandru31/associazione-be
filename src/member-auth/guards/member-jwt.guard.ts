import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class MemberJwtGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any) {
    if (err || !user || user.type !== 'member') {
      throw err || new UnauthorizedException('Accesso riservato ai soci');
    }
    return user;
  }
}
