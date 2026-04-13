# DELIVRO API - Récapitulatif

> **Base URL** : `http://localhost:3000/api`  
> **Swagger UI** : `http://localhost:3000/swagger`  
> **Authentification** : Bearer JWT requis pour toutes les routes (sauf login)

---

## Table des matières

1. [Authentification](#-authentification)
2. [Super Admin](#-super-admin)
3. [Comptes & Utilisateurs](#-comptes--utilisateurs)
4. [Clients](#-clients)
5. [Produits & Stock](#-produits--stock)
6. [Commandes](#-commandes)
7. [Bons de Livraison](#-bons-de-livraison)
8. [Factures](#-factures)
9. [Finance](#-finance)
10. [Abonnements](#-abonnements)
11. [Statistiques](#-statistiques)
12. [Livreur](#-livreur)

---

## 🔐 Authentification

| Méthode | Endpoint | Description | Rôles |
|---------|----------|-------------|-------|
| `POST` | `/api/auth/login` | Login → retourne JWT | Public |
| `GET` | `/api/auth/me` | Profil utilisateur connecté | Tous |
| `POST` | `/api/auth/logout` | Déconnexion (invalide token) | Tous |

---

## 👑 Super Admin

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/super/dashboard` | Métriques globales + livreurs actifs |
| `GET` | `/api/super/livreurs` | Tous les livreurs en temps réel |

---

## 👤 Comptes & Utilisateurs

### Super Admin uniquement
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/api/comptes` | Créer un compte (admin/employé/livreur) |
| `GET` | `/api/comptes` | Lister tous les comptes |
| `PATCH` | `/api/comptes/:id/statut` | Activer/suspendre un compte |
| `DELETE` | `/api/comptes/:id` | Supprimer un compte |

### Admin (gestion de ses employés)
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/api/comptes/employes` | Créer un employé rattaché à soi |
| `GET` | `/api/comptes/employes` | Lister ses propres employés |
| `PATCH` | `/api/comptes/employes/:id/statut` | Activer/suspendre un employé |

---

## 👥 Clients

| Méthode | Endpoint | Description | Rôles |
|---------|----------|-------------|-------|
| `GET` | `/api/clients?search=` | Lister le carnet clients | Admin, Employé |
| `POST` | `/api/clients` | Créer un client | Admin, Employé |
| `PUT` | `/api/clients/:id` | Modifier un client | Admin, Employé |
| `DELETE` | `/api/clients/:id` | Supprimer un client | Admin uniquement |

---

## 📦 Produits & Stock

| Méthode | Endpoint | Description | Rôles |
|---------|----------|-------------|-------|
| `GET` | `/api/produits?categorieId=&niveau=&search=` | Lister produits (filtres) | Admin, Employé |
| `POST` | `/api/produits` | Créer un produit | Admin, Employé |
| `PUT` | `/api/produits/:id` | Modifier un produit | Admin, Employé |
| `PATCH` | `/api/produits/:id/stock` | Ajuster le stock (+/-) | Admin, Employé |
| `DELETE` | `/api/produits/:id` | Supprimer un produit | Admin, Employé |
| `GET` | `/api/produits/alertes` | Alertes stock non lues | Admin, Employé |
| `GET` | `/api/produits/categories` | Lister les catégories | Admin, Employé |
| `POST` | `/api/produits/categories` | Créer une catégorie | Admin, Employé |

**Niveaux de stock** : `vide`, `bas`, `moyen`, `plein`

---

## 🛒 Commandes

| Méthode | Endpoint | Description | Rôles |
|---------|----------|-------------|-------|
| `GET` | `/api/commandes?statut=&clientId=&search=` | Lister les commandes | Admin, Employé |
| `POST` | `/api/commandes` | Créer une commande (prix auto depuis base) | Admin, Employé |
| `GET` | `/api/commandes/:id` | Détail d'une commande + lignes | Admin, Employé |
| `PATCH` | `/api/commandes/:id/annuler` | Annuler une commande confirmée | Admin, Employé |

**Statuts commande** : `brouillon`, `confirmee`, `en_preparation`, `en_livraison`, `livree`, `retour`, `annulee`

---

## 🚚 Bons de Livraison

### Admin / Employé
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/livraisons?statut=&livreurId=` | Lister les bons de livraison |
| `POST` | `/api/livraisons` | Créer un bon (stock retiré immédiatement) |
| `GET` | `/api/livraisons/:id` | Détail d'un bon |

### Livreur (actions)
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `PATCH` | `/api/livraisons/:id/accepter` | Accepter la livraison |
| `PATCH` | `/api/livraisons/:id/refuser` | Refuser → stock réintégré |
| `PATCH` | `/api/livraisons/:id/resultat` | Livré ou retour (motif obligatoire si retour) |

**Statuts bon** : `en_attente`, `en_cours`, `livre`, `retour`, `echoue`

---

## 📄 Factures

| Méthode | Endpoint | Description | Rôles |
|---------|----------|-------------|-------|
| `GET` | `/api/factures?statut=&clientId=&search=` | Lister les factures | Admin, Employé |
| `POST` | `/api/factures` | Créer une facture depuis commande livrée | Admin, Employé |
| `GET` | `/api/factures/:id` | Détail + aperçu PDF | Admin, Employé |
| `PATCH` | `/api/factures/:id/statut` | Changer statut (payée/annulée) | Admin, Employé |

**Statuts facture** : `brouillon`, `envoyee`, `payee`, `annulee`

---

## 💰 Finance (Admin uniquement)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/finance?mois=&annee=` | Transactions + bilan mensuel |
| `POST` | `/api/finance/depense` | Enregistrer une dépense (masarif) |
| `GET` | `/api/finance/bilan?annee=` | Revenus / dépenses / bénéfice par mois |

**Types transaction** : `revenu`, `depense`  
**Catégories** : `vente`, `achat_stock`, `salaire`, `loyer`, `transport`, `autre`

---

## 💳 Abonnements (Super Admin uniquement)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/abonnements` | Lister tous les abonnements |
| `POST` | `/api/abonnements/:id/payer` | Marquer payé + renouveler échéance +30j |
| `PATCH` | `/api/abonnements/:id/plan` | Changer plan (49/99/199 DT) |

**Plans** : `starter`, `pro`, `business`

---

## 📊 Statistiques (Admin uniquement)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/stats?debut=&fin=` | CA global par période |
| `GET` | `/api/stats/regions` | CA par région |
| `GET` | `/api/stats/categories` | CA par catégorie |
| `GET` | `/api/stats/produits?limit=&region=` | Top produits (filtre produit × région) |

---

## 🚛 Livreur (Espace livreur)

| Méthode | Endpoint | Description | Rôles |
|---------|----------|-------------|-------|
| `GET` | `/api/livreur/livraisons` | Mes livraisons assignées | Livreur |

---

## 🔒 Rôles d'accès

| Rôle | Permissions |
|------|-------------|
| `super_admin` | Tout (dashboard global, gestion abonnements, tous les comptes) |
| `admin` | CRUD complet (clients, produits, commandes, factures, livraisons, finance, stats, ses employés) |
| `employe` | CRUD limité (clients, produits, commandes, factures, livraisons) |
| `livreur` | Actions livreur uniquement (accepter, refuser, résultat livraison, voir ses livraisons) |

---

## 📋 Résumé des modules

| Module | Nb Endpoints | Description |
|--------|--------------|-------------|
| Auth | 3 | Login, logout, profil |
| Super Admin | 2 | Dashboard global, vue livreurs |
| Comptes | 7 | Gestion utilisateurs (admin/employé/livreur) |
| Clients | 4 | Carnet clients |
| Produits | 8 | Gestion stock + catégories + alertes |
| Commandes | 4 | Cycle de vie commande |
| Livraisons | 6 | Bons de livraison + actions livreur |
| Factures | 4 | Facturation PDF |
| Finance | 3 | Transactions et bilan |
| Abonnements | 3 | Gestion SaaS |
| Stats | 4 | Analytics métier |
| Livreur | 1 | Espace livreur |

**Total : 49 endpoints API**

---

*Généré le : 13 Avril 2026*
