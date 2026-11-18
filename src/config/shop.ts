// Catégories de la boutique. Ajoutez, retirez ou renommez ici.

export const CATEGORIES = [
  { id: 'eau-boissons', name: 'Eau et boissons', hint: 'Eau minérale, eau en sachet, jus, sodas' },
  { id: 'vivres', name: 'Riz et vivres', hint: 'Sacs de riz, huile, sucre, oignons, condiments' },
  { id: 'viande', name: 'Viande et bétail', hint: 'Moutons, bœufs, poulets' },
  { id: 'chaises-tables', name: 'Chaises et tables', hint: 'Chaises, tables, housses' },
  { id: 'baches-tentes', name: 'Bâches et tentes', hint: 'Bâches, tentes, chapiteaux' },
  { id: 'vaisselle', name: 'Vaisselle et cuisine', hint: 'Assiettes, verres, marmites, couverts' },
  { id: 'decoration', name: 'Décoration', hint: 'Fleurs, ballons, nappes, décor de salle' },
  { id: 'sono-eclairage', name: 'Sono et éclairage', hint: 'Sonorisation, DJ, groupe électrogène, lumières' },
  { id: 'services', name: 'Services', hint: 'Traiteur, griots, photographe, transport' },
  { id: 'autres', name: 'Autres', hint: 'Tout le reste pour la fête' },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]['id'];

export const categoryName = (id: string) => CATEGORIES.find((c) => c.id === id)?.name || 'Autres';

export const ORDER_STATUS: Record<string, string> = {
  en_attente: 'Envoyée au vendeur',
  acceptee: 'Acceptée',
  refusee: 'Refusée',
  en_preparation: 'En préparation',
  en_livraison: 'En livraison',
  livree: 'Livrée',
  terminee: 'Terminée',
  annulee: 'Annulée',
};

/** Étapes que le vendeur peut faire avancer, dans l'ordre */
export const NEXT_STATUS: Record<string, string[]> = {
  en_attente: ['acceptee', 'refusee'],
  acceptee: ['en_preparation', 'annulee'],
  en_preparation: ['en_livraison', 'livree'],
  en_livraison: ['livree'],
  livree: ['terminee'],
};
