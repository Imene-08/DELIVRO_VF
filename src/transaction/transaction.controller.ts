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
import { role_compte } from '@prisma/client';
import { CreateDepenseDto } from './dto/create-depense.dto';

interface AuthenticatedRequest {
  user: { userId: string; email: string; role: role_compte };
}

@ApiTags('Finance')
@ApiBearerAuth('Bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(role_compte.admin)
@Controller('finance')
export class TransactionController {
  constructor(private transactionService: TransactionService) {}

  @Get()
  @ApiOperation({ summary: 'Transactions + bilan mensuel' })
  @ApiQuery({ name: 'mois', example: '12', required: false })
  @ApiQuery({ name: 'annee', example: '2024', required: false })
  async getFinance(
    @Request() req: AuthenticatedRequest,
    @Query('mois') mois?: string,
    @Query('annee') annee?: string,
  ) {
    return this.transactionService.getFinance(req.user.userId, { mois, annee });
  }

  @Post('depense')
  @ApiOperation({ summary: 'Enregistrer une dépense (masarif)' })
  async createDepense(@Body() dto: CreateDepenseDto, @Request() req: AuthenticatedRequest) {
    return this.transactionService.createDepense(req.user.userId, dto);
  }

  @Get('bilan')
  @ApiOperation({ summary: 'Revenus / dépenses / bénéfice par mois' })
  @ApiQuery({ name: 'annee', example: '2024', required: false })
  async getBilan(@Request() req: AuthenticatedRequest, @Query('annee') annee?: string) {
    return this.transactionService.getBilan(req.user.userId, annee);
  }
}
