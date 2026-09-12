import { Injectable, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class AdminGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any) {
    if (err || !user) throw err || new ForbiddenException();
    if (user.role !== 'ADMIN' && user.role !== 'SUPERADMIN') {
      throw new ForbiddenException('Accesso riservato agli amministratori');
    }
    return user;
  }
}
