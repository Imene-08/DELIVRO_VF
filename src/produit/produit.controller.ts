import {
  Controller,
  Get,
  Post,
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

interface AuthenticatedRequest {
  user: {
    userId: string;
    email: string;
    role: role_compte;
  };
}

@ApiTags('Admin - Produits & Stock')
@Controller('admin')
export class ProduitController {
  constructor(private produitService: ProduitService) {}

  @Post('produits')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(role_compte.admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer un produit' })
  async create(@Body() dto: CreateProduitDto, @Request() req: AuthenticatedRequest) {
    return this.produitService.create(req.user.userId, dto);
  }

  @Get('produits')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(role_compte.admin, role_compte.employe)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Liste des produits (filtrée par admin)' })
  @ApiQuery({ name: 'categorieId', required: false })
  @ApiQuery({ name: 'niveau', enum: niveau_stock, required: false })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query('categorieId') categorieId?: string,
    @Query('niveau') niveau?: niveau_stock,
    @Query('search') search?: string,
  ) {
    return this.produitService.findAll(req.user.userId, { categorieId, niveau, search });
  }

  @Get('produits/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(role_compte.admin, role_compte.employe)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Détail d\'un produit avec alertes' })
  async findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.produitService.findOne(req.user.userId, id);
  }

  @Patch('produits/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(role_compte.admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Modifier un produit' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProduitDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.produitService.update(req.user.userId, id, dto);
  }

  @Delete('produits/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(role_compte.admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer un produit' })
  async remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.produitService.remove(req.user.userId, id);
  }

  @Get('stock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(role_compte.admin, role_compte.employe)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Stock avec niveaux visuels (vide/bas/moyen/plein)' })
  async getStock(@Request() req: AuthenticatedRequest) {
    return this.produitService.getStockWithLevels(req.user.userId);
  }

  @Patch('produits/:id/stock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(role_compte.admin, role_compte.employe)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ajouter/retirer du stock (+/- quantité)' })
  async updateStock(
    @Param('id') id: string,
    @Body() dto: UpdateStockDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.produitService.updateStock(req.user.userId, id, dto);
  }

  @Get('alertes-stock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(role_compte.admin, role_compte.employe)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Liste des alertes stock' })
  @ApiQuery({ name: 'lu', type: Boolean, required: false })
  @ApiQuery({ name: 'niveau', enum: niveau_stock, required: false })
  async getAlertes(
    @Request() req: AuthenticatedRequest,
    @Query('lu') lu?: string,
    @Query('niveau') niveau?: niveau_stock,
  ) {
    const parsedLu = lu === 'true' ? true : lu === 'false' ? false : undefined;
    return this.produitService.getAlertesStock(req.user.userId, { lu: parsedLu, niveau });
  }

  @Patch('alertes-stock/:id/lu')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(role_compte.admin, role_compte.employe)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Marquer une alerte comme lue' })
  async marquerAlerteLue(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.produitService.marquerAlerteLue(req.user.userId, id);
  }
}
