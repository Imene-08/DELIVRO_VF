import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, role: string, search?: string) {
    const adminId = await this.prisma.resolveAdminId(userId, role);
    const where: any = { admin_id: adminId };

    if (search) {
      where.OR = [
        { nom: { contains: search, mode: 'insensitive' } },
        { telephone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const clients = await this.prisma.clients.findMany({
      where,
      include: { _count: { select: { commandes: true } } },
      orderBy: { cree_le: 'desc' },
    });

    return { total: clients.length, clients };
  }

  async create(userId: string, role: string, dto: CreateClientDto) {
    const adminId = await this.prisma.resolveAdminId(userId, role);
    const client = await this.prisma.clients.create({
      data: { ...dto, admin_id: adminId },
    });
    return { message: 'Client créé avec succès', client };
  }

  async update(userId: string, role: string, clientId: string, dto: UpdateClientDto) {
    const adminId = await this.prisma.resolveAdminId(userId, role);
    const client = await this.prisma.clients.findFirst({ where: { id: clientId, admin_id: adminId } });

    if (!client) throw new NotFoundException('Client non trouvé');

    const updated = await this.prisma.clients.update({
      where: { id: clientId },
      data: dto,
    });
    return { message: 'Client mis à jour avec succès', client: updated };
  }

  async remove(userId: string, role: string, clientId: string) {
    const adminId = await this.prisma.resolveAdminId(userId, role);
    const client = await this.prisma.clients.findFirst({ where: { id: clientId, admin_id: adminId } });

    if (!client) throw new NotFoundException('Client non trouvé');

    await this.prisma.clients.delete({ where: { id: clientId } });
    return { message: 'Client supprimé avec succès' };
  }
}
