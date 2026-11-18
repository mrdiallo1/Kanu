// Ajoute une boutique de démonstration (un vendeur validé et ses produits).
// À lancer quand l'application est arrêtée :  npm run demo
// Compte vendeur créé : téléphone 71000000, mot de passe vendeur1

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const dir = path.resolve(process.env.DATA_DIR || './data');
const file = path.join(dir, 'db.json');
fs.mkdirSync(dir, { recursive: true });
const db = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
for (const k of ['users', 'events', 'guests', 'agents', 'media', 'guestbook', 'checkins', 'payments', 'uploads', 'groups', 'messages', 'vendors', 'products', 'orders']) db[k] ??= [];

if (db.users.some((u) => u.phone === '71000000')) {
  console.log('La boutique de démonstration existe déjà.');
  process.exit(0);
}

const now = () => new Date().toISOString();
const id = () => crypto.randomUUID();
const salt = crypto.randomBytes(16).toString('hex');
const user = { id: id(), name: 'Bakary Diarra', phone: '71000000', passwordHash: `${salt}:${crypto.scryptSync('vendeur1', salt, 64).toString('hex')}`, createdAt: now() };
const vendor = { id: id(), userId: user.id, businessName: 'Diarra Fête & Alimentation', phone: '71000000', city: 'Bamako', description: 'Vivres, boissons et location de matériel pour mariages et baptêmes. Livraison dans tout Bamako.', status: 'valide', createdAt: now() };

const P = (name, category, price, unit, mode, stock, minQty, description, delivery) => ({
  id: id(), vendorId: vendor.id, name, description, category, price, unit, mode, stock, minQty, photos: [], delivery, active: true, createdAt: now(),
});
const products = [
  P('Riz brisé parfumé', 'vivres', 27500, 'le sac de 50 kg', 'vente', 120, 1, 'Riz importé de bonne qualité, idéal pour le riz au gras et le riz sauce.', 'Livraison gratuite dans Bamako dès 5 sacs.'),
  P('Huile végétale', 'vivres', 22000, 'le bidon de 20 L', 'vente', 40, 1, 'Huile raffinée pour la cuisine en grande quantité.', 'Livraison avec le riz.'),
  P('Sucre en poudre', 'vivres', 30000, 'le sac de 50 kg', 'vente', 30, 1, '', 'Livraison dans Bamako.'),
  P('Eau en sachet', 'eau-boissons', 1500, 'le paquet de 30 sachets', 'vente', 0, 10, 'Eau potable fraîche, livrée le matin de la fête.', 'Commande la veille avant 18 h.'),
  P('Eau minérale 1,5 L', 'eau-boissons', 3000, 'le pack de 6 bouteilles', 'vente', 200, 5, '', 'Livraison dans Bamako.'),
  P('Jus de bissap et de gingembre', 'eau-boissons', 6000, 'le carton de 12 bouteilles', 'vente', 0, 2, 'Fait maison, servi frais.', 'Commande 3 jours avant.'),
  P('Chaises plastiques blanches', 'chaises-tables', 150, 'la chaise par jour', 'location', 800, 50, 'Chaises propres et solides. Housses disponibles en option.', 'Livraison et reprise : 5 000 FCFA.'),
  P('Tables rectangulaires', 'chaises-tables', 1500, 'la table par jour', 'location', 60, 5, 'Tables de 8 places.', 'Livraison et reprise avec les chaises.'),
  P('Bâche 10 × 20 m', 'baches-tentes', 35000, 'la bâche par jour', 'location', 6, 1, 'Montage et démontage compris.', 'Montage la veille au soir.'),
  P('Grandes marmites', 'vaisselle', 2500, 'la marmite par jour', 'location', 25, 1, 'Marmites de 50 à 100 litres.', 'Retrait au magasin à Badalabougou.'),
  P('Sonorisation et DJ', 'sono-eclairage', 75000, 'la soirée', 'location', 0, 1, 'Enceintes, micros et DJ pour la soirée dansante.', 'Installation comprise.'),
  P('Groupe électrogène 10 kVA', 'sono-eclairage', 40000, 'par jour', 'location', 3, 1, 'Carburant non compris.', 'Livraison et installation comprises.'),
];

db.users.push(user);
db.vendors.push(vendor);
db.products.push(...products);
fs.writeFileSync(file, JSON.stringify(db, null, 2));
console.log(`Boutique de démonstration ajoutée : ${products.length} produits.`);
