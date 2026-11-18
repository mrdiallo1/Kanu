# Kanu

Plateforme web (PWA) pour les mariages et les baptêmes, pensée d’abord pour le téléphone : invitations par lien et code, QR code personnel et contrôle des entrées, galerie photos et vidéos façon iPhone, discussions de groupe façon WhatsApp, boutique pour tout acheter ou louer (eau, riz, chaises, bâches…), livre d’or écrit et vocal, téléchargement de tous les souvenirs.

« Kanu » est un nom provisoire. Pour le changer : `src/config/site.ts` et `public/manifest.webmanifest`.

## Démarrer

Il faut Node.js 20 ou plus récent.

```bash
npm install
cp .env.example .env.local     # puis ouvrez-le et remplissez les valeurs
npm run dev                    # http://localhost:3000
```

Pour remplir la boutique avec des produits d’exemple (application arrêtée) :

```bash
npm run demo     # crée le vendeur 71000000 / vendeur1 et 12 produits
```

Pour tester sur un téléphone du même Wi-Fi, mettez l’adresse IP de l’ordinateur dans `NEXT_PUBLIC_SITE_URL` (par exemple `http://192.168.1.20:3000`). La caméra et le micro ne fonctionnent qu’en HTTPS (ou sur `localhost`). Pour tester le scanner et les vocaux sur téléphone, utilisez un tunnel HTTPS (Cloudflare Tunnel, ngrok…).

Version de production :

```bash
npm run build
npm start
```

Le compte dont le numéro figure dans `ADMIN_PHONES` voit le lien « Administration ».

## Ce qui fonctionne déjà

| Partie | Pages |
|---|---|
| Site public et offres | `/` |
| Comptes organisateurs | `/inscription`, `/connexion` |
| Création d’un mariage ou d’un baptême (5 étapes) | `/creer` |
| Paiement (simulé pour l’instant) | `/paiement/[id]` |
| Tableau de bord : aperçu, invités, entrées, galerie, livre d’or, souvenirs, réglages | `/tableau/[id]/…` |
| Espace des invités (barre de navigation en bas) : accueil, photos, discussions, livre d’or, mon invitation | `/e/[slug]`, `/e/[slug]/photos`, `/e/[slug]/discussions`, `/e/[slug]/livre-or`, `/e/[slug]/invitation` |
| Discussions : groupes créés par les mariés (ou les invités autorisés), membres choisis, administrateurs de groupe | `/e/[slug]/discussions/[groupe]` |
| Boutique : catégories, recherche, fiche produit, panier, commande, suivi | `/boutique`, `/boutique/panier`, `/boutique/commandes` |
| Espace vendeur : inscription, produits avec photos, commandes à accepter et faire avancer | `/vendeur` |
| Invitation personnelle avec QR code et réponse présent/absent | `/invitation/[jeton]` |
| Saisie manuelle du code | `/rejoindre` |
| Application de contrôle pour les agents (caméra, recherche par nom, hors ligne) | `/controle/[slug]` |
| Administration générale (espaces, paiements, validation des vendeurs) | `/admin` |

### Galerie

Grille carrée regroupée par jour, filtres Tout / Photos / Vidéos / par invité, sélection multiple pour télécharger ou supprimer. La visionneuse plein écran se balaie à gauche et à droite, se ferme en glissant vers le bas, zoome par pincement ou double tap, avec une bande de miniatures en bas. Le bouton + ouvre directement les photos du téléphone ; l’envoi continue en arrière-plan avec une barre de progression.

### Discussions

Les mariés créent des groupes (famille, amis, organisation…) et choisissent les invités. Ils peuvent autoriser un invité à créer ses propres groupes (fiche de l’invité) et nommer des administrateurs de groupe. Les messages arrivent toutes les 3 secondes (interrogation régulière du serveur). Pour du vrai temps réel à grande échelle, remplacez-la par des WebSockets ou un service comme Pusher, Ably ou Supabase Realtime.

### Boutique

Chaque vendeur s’inscrit sur `/vendeur`, puis l’administrateur le valide dans `/admin` avant que ses produits n’apparaissent. Un produit est en vente ou en location, avec un prix, une unité (le sac de 50 kg, la chaise par jour…), un stock et un minimum de commande. Un panier qui contient les produits de plusieurs vendeurs crée une commande par vendeur. Pour l’instant, le client paie à la livraison ; le paiement en ligne des commandes pourra passer par le même prestataire que les forfaits. Les catégories se modifient dans `src/config/shop.ts`.

Les trois offres (10 000, 20 000 et 25 000 FCFA) et ce qu’elles contiennent sont dans `src/config/plans.ts`. Les pages, les limites et les contrôles lisent ce fichier : pour changer un prix ou une limite, modifiez-le là.

## Organisation du code

```
src/
  config/        nom du site, offres et prix
  lib/
    db/          accès aux données  ← à remplacer par votre base
    storage/     stockage des fichiers  ← à remplacer par un stockage objet
    payments/    paiements  ← à brancher sur Orange Money, Wave…
    auth.ts      comptes, sessions, qui a le droit de voir quoi
    access.ts    règles des offres, quota, conservation
    uploads.ts   réception des envois par morceaux, vignettes
    export.ts    archives ZIP, PDF du livre d’or, mini-site
  app/
    api/         toutes les routes serveur
    …            les pages
  components/    les éléments d’interface
public/          manifeste PWA, service worker, icônes
```

## Brancher la base de données

Aujourd’hui les données sont écrites dans `data/db.json`, ce qui suffit pour développer et faire des démonstrations, pas pour la production.

Toute l’application passe par les fonctions de `src/lib/db/index.ts` (`users`, `events`, `guests`, `agents`, `media`, `uploads`, `guestbook`, `checkins`, `payments`). Réécrivez ces fonctions avec votre base en gardant les mêmes noms et les mêmes types, et rien d’autre n’a besoin de changer. Le schéma des tables est décrit dans `docs/BASE_DE_DONNEES.md`.

## Brancher le stockage des fichiers

Les photos, vidéos et vocaux sont écrits dans `storage/`. En production, remplacez les fonctions de `src/lib/storage/index.ts` par un stockage objet compatible S3 (Cloudflare R2 conseillé : pas de frais de sortie, ce qui compte quand 500 invités téléchargent des vidéos). Les originaux ne sont jamais recompressés.

## Brancher les paiements

Voir `src/lib/payments/index.ts` et `src/app/api/paiements/rappel/route.ts`. Avec `PAYMENT_MODE=simulation`, tout paiement est accepté immédiatement. En production :

1. `startPayment` appelle l’API du prestataire et renvoie son URL de paiement ;
2. le prestataire appelle `/api/paiements/rappel` quand le paiement est confirmé ;
3. cette route vérifie la signature et le montant, puis appelle `markPaid`.

Un paiement ne doit jamais être validé sur la seule foi du navigateur.

## À prévoir avant la mise en ligne

- **Vidéos** : générer une version allégée (720p) et une image d’aperçu pour chaque vidéo avec ffmpeg, dans une tâche en arrière-plan. Aujourd’hui la galerie lit l’original directement : ça fonctionne, mais c’est lourd en 3G.
- **Vocaux** : convertir tous les vocaux en AAC (.m4a) côté serveur. Chrome enregistre en WebM, que les anciens iPhone lisent mal.
- **Photos HEIC** (iPhone) : la vignette n’est pas générée. Il faut une version de sharp compilée avec libheif, ou une conversion séparée.
- **Notifications** : stockage à 80, 90 et 100 %, export prêt, approche de la suppression. Les alertes s’affichent déjà dans le tableau de bord. Pour les envoyer par SMS, WhatsApp ou notification push, il faut un service d’envoi.
- **Suppression automatique** : une tâche planifiée (cron) qui supprime les fichiers des espaces dont la date `expiresAt` (dans `src/lib/access.ts`) est passée, après les rappels.
- **Export très volumineux** : les archives sont créées à la volée, découpées par tranches de 4 Go et sans recompression. Au-delà de quelques dizaines de Go, préparez-les plutôt dans une tâche en arrière-plan, déposez-les dans le stockage et envoyez un lien temporaire.
- **Limitation des abus** : `rateLimit` (dans `src/lib/api.ts`) garde ses compteurs en mémoire. Avec plusieurs serveurs, passez par Redis.
- **Mot de passe oublié** : à ajouter avec un code par SMS.

## Sécurité déjà en place

- Sessions signées, en cookie HTTP-only.
- Chaque route vérifie que l’utilisateur appartient bien à l’espace concerné. Les invités d’un mariage ne peuvent jamais voir les fichiers d’un autre.
- Rôles séparés : organisateur, invité, photographe, agent de contrôle (qui ne voit que la liste nécessaire), administrateur.
- Les fichiers ne sont pas publics : ils passent par `/api/medias/[id]`, qui vérifie les droits.
- Le contenu des fichiers envoyés est vérifié (signature du format), pas seulement leur extension.
- Le quota tient compte des envois en cours, ce qui évite les dépassements.
- QR codes : un jeton secret par invité, remplaçable ; une entrée unique par espace contrôlé.
