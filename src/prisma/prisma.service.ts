import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Résout l'ID admin effectif selon le rôle :
   * - super_admin → retourne userId (accès global)
   * - admin → retourne son propre ID
   * - employe → retourne l'admin_parent_id
   */
  async resolveAdminId(userId: string, role: string): Promise<string> {
    if (role === 'employe') {
      const compte = await this.comptes.findUnique({
        where: { id: userId },
        select: { admin_parent_id: true },
      });
      return compte?.admin_parent_id ?? userId;
    }
    return userId;
  }
}
