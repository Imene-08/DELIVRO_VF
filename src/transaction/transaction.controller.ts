import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { TransactionService } from './transaction.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { role_compte, type_transaction, cat_transaction } from '@prisma/client';
import { CreateTransactionDto } from './dto/create-transaction.dto';

interface AuthenticatedRequest {
  user: {
    userId: string;
    email: string;
    role: role_compte;
  };
}

@ApiTags('Admin - Finance')
@Controller('admin')
export class TransactionController {
  constructor(private transactionService: TransactionService) {}

  @Get('finance')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(role_compte.admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tableau de bord financier : revenus, dépenses, bénéfice' })
  @ApiQuery({ name: 'mois', example: '12', required: false })
  @ApiQuery({ name: 'annee', example: '2024', required: false })
  async getFinance(
    @Request() req: AuthenticatedRequest,
    @Query('mois') mois?: string,
    @Query('annee') annee?: string,
  ) {
    return this.transactionService.getFinance(req.user.userId, { mois, annee });
  }

  @Get('transactions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(role_compte.admin, role_compte.employe)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Liste des transactions filtrées' })
  @ApiQuery({ name: 'type', enum: type_transaction, required: false })
  @ApiQuery({ name: 'categorie', enum: cat_transaction, required: false })
  @ApiQuery({ name: 'mois', example: '12', required: false })
  @ApiQuery({ name: 'annee', example: '2024', required: false })
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query('type') type?: type_transaction,
    @Query('categorie') categorie?: cat_transaction,
    @Query('mois') mois?: string,
    @Query('annee') annee?: string,
  ) {
    return this.transactionService.findAll(req.user.userId, { type, categorie, mois, annee });
  }

  @Post('transactions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(role_compte.admin, role_compte.employe)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ajouter une transaction (revenu ou dépense)' })
  async create(@Body() dto: CreateTransactionDto, @Request() req: AuthenticatedRequest) {
    return this.transactionService.create(req.user.userId, req.user.userId, dto);
  }
}
