import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { SuperAdminModule } from './super-admin/super-admin.module';
import { ComptesModule } from './comptes/comptes.module';
import { AbonnementsModule } from './abonnements/abonnements.module';
import { ProduitModule } from './produit/produit.module';
import { ClientsModule } from './clients/clients.module';
import { CommandeModule } from './commande/commande.module';
import { LivraisonModule } from './livraison/livraison.module';
import { LivreurModule } from './livreur/livreur.module';
import { FactureModule } from './facture/facture.module';
import { TransactionModule } from './transaction/transaction.module';
import { StatsModule } from './stats/stats.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    SuperAdminModule,
    ComptesModule,
    AbonnementsModule,
    ProduitModule,
    ClientsModule,
    CommandeModule,
    LivraisonModule,
    LivreurModule,
    FactureModule,
    TransactionModule,
    StatsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
