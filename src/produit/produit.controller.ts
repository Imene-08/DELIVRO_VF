import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ProduitService } from './produit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { role_compte, niveau_stock } from '@prisma/client';
import { CreateProduitDto } from './dto/create-produit.dto';
import { UpdateProduitDto } from './dto/update-produit.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { CreateCategorieDto } from './dto/create-categorie.dto';

interface AuthenticatedRequest {
  user: { userId: string; email: string; role: role_compte };
}

@ApiTags('Produits & Stock')
@ApiBearerAuth('Bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(role_compte.admin, role_compte.employe)
@Controller('produits')
export class ProduitController {
  constructor(private produitService: ProduitService) {}

  @Get()
  @ApiOperation({ summary: 'Lister produits (filtre: niveau, catégorie)' })
  @ApiQuery({ name: 'categorieId', required: false })
  @ApiQuery({ name: 'niveau', enum: niveau_stock, required: false })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query('categorieId') categorieId?: string,
    @Query('niveau') niveau?: niveau_stock,
    @Query('search') search?: string,
  ) {
    return this.produitService.findAll(req.user.userId, req.user.role, { categorieId, niveau, search });
  }

  @Post()
  @ApiOperation({ summary: 'Créer un produit (attributs JSONB libres)' })
  async create(@Body() dto: CreateProduitDto, @Request() req: AuthenticatedRequest) {
    return this.produitService.create(req.user.userId, req.user.role, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Modifier un produit' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProduitDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.produitService.update(req.user.userId, req.user.role, id, dto);
  }

  @Patch(':id/stock')
  @ApiOperation({ summary: 'Ajuster la quantité (+/-)' })
  async updateStock(
    @Param('id') id: string,
    @Body() dto: UpdateStockDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.produitService.updateStock(req.user.userId, req.user.role, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un produit' })
  async remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.produitService.remove(req.user.userId, req.user.role, id);
  }

  @Get('alertes')
  @ApiOperation({ summary: 'Alertes stock non lues' })
  async getAlertes(@Request() req: AuthenticatedRequest) {
    return this.produitService.getAlertesStock(req.user.userId, req.user.role, { lu: false });
  }

  @Get('categories')
  @ApiOperation({ summary: 'Lister les catégories' })
  async getCategories(@Request() req: AuthenticatedRequest) {
    return this.produitService.findAllCategories(req.user.userId, req.user.role);
  }

  @Post('categories')
  @ApiOperation({ summary: 'Créer une catégorie' })
  async createCategorie(@Body() dto: CreateCategorieDto, @Request() req: AuthenticatedRequest) {
    return this.produitService.createCategorie(req.user.userId, req.user.role, dto);
  }
}
