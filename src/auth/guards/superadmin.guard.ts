import { Injectable, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class SuperadminGuard extends AuthGuard('cognito') {
  handleRequest(err: any, user: any) {
    if (err || !user) throw err || new ForbiddenException();
    if (user.role !== 'SUPERADMIN') {
      throw new ForbiddenException('Accesso riservato al Superadmin');
    }
    return user;
  }
}
