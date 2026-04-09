import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { role_compte } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

interface AuthenticatedRequest {
  user: {
    userId: string;
    email: string;
    role: role_compte;
  };
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<role_compte[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    return requiredRoles.some((role) => user.role === role);
  }
}
