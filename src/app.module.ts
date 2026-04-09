import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { SuperAdminModule } from './super-admin/super-admin.module';
import { AdminModule } from './admin/admin.module';
import { EmployeModule } from './employe/employe.module';
import { LivreurModule } from './livreur/livreur.module';
import { ProduitModule } from './produit/produit.module';
import { CommandeModule } from './commande/commande.module';
import { TransactionModule } from './transaction/transaction.module';
import { LivraisonModule } from './livraison/livraison.module';
import { StatsModule } from './stats/stats.module';
import { ComptesModule } from './comptes/comptes.module';

@Module({
  imports: [
    AuthModule,
    SuperAdminModule,
    AdminModule,
    EmployeModule,
    LivreurModule,
    ProduitModule,
    CommandeModule,
    TransactionModule,
    LivraisonModule,
    StatsModule,
    ComptesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
