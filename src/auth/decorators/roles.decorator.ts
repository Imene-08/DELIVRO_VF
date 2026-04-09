import { SetMetadata } from '@nestjs/common';
import { role_compte } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: role_compte[]) => SetMetadata(ROLES_KEY, roles);
