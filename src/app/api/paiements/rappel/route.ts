// Route appelée par le prestataire de paiement (webhook / URL de notification)
// quand un paiement est confirmé.
//
// À faire lors du branchement :
// 1. Vérifier la signature envoyée par le prestataire (clé secrète).
// 2. Retrouver le paiement grâce à la référence transmise.
// 3. Vérifier le montant reçu.
// 4. Appeler markPaid(payment.id).

import { fail } from '@/lib/api';

export async function POST() {
  return fail('Aucun prestataire de paiement n’est encore branché.', 501);
}
