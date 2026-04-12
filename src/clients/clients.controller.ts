import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { role_compte } from '@prisma/client';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

interface AuthenticatedRequest {
  user: { userId: string; email: string; role: role_compte };
}

@ApiTags('Clients')
@ApiBearerAuth('Bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(role_compte.admin, role_compte.employe)
@Controller('clients')
export class ClientsController {
  constructor(private clientsService: ClientsService) {}

  @Get()
  @ApiOperation({ summary: 'Lister le carnet clients' })
  @ApiQuery({ name: 'search', required: false })
  async findAll(@Request() req: AuthenticatedRequest, @Query('search') search?: string) {
    return this.clientsService.findAll(req.user.userId, req.user.role, search);
  }

  @Post()
  @ApiOperation({ summary: 'Créer un client' })
  async create(@Body() dto: CreateClientDto, @Request() req: AuthenticatedRequest) {
    return this.clientsService.create(req.user.userId, req.user.role, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Modifier un client' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.clientsService.update(req.user.userId, req.user.role, id, dto);
  }

  @Delete(':id')
  @Roles(role_compte.admin)
  @ApiOperation({ summary: 'Supprimer un client (admin uniquement)' })
  async remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.clientsService.remove(req.user.userId, req.user.role, id);
  }
}
