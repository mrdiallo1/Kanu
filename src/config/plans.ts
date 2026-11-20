// Les trois offres. Modifiez les prix, limites et fonctions ici :
// toute l'application (pages, contrôles, quotas) lit ce fichier.

export type PlanId = 'essentiel' | 'classique' | 'prestige';

export type Feature =
  | 'galerie'
  | 'livreOrEcrit'
  | 'livreOrVocal'
  | 'qrCodes'
  | 'exportComplet'
  | 'livreOrPdf'
  | 'miniSite'
  | 'photographe'
  | 'plusieursEspaces';

export interface Plan {
  id: PlanId;
  name: string;
  price: number; // en FCFA
  maxGuests: number; // nombre de personnes (places) au total
  storageGb: number;
  retentionDays: number; // jours de conservation après la date de l'événement
  maxVoiceSeconds: number;
  features: Feature[];
  pitch: string;
}

export const PLANS: Record<PlanId, Plan> = {
  essentiel: {
    id: 'essentiel',
    name: 'Essentiel',
    price: 10000,
    maxGuests: 150,
    storageGb: 20,
    retentionDays: 30,
    maxVoiceSeconds: 0,
    features: ['galerie', 'livreOrEcrit'],
    pitch: 'Pour réunir les photos et les mots de vos proches.',
  },
  classique: {
    id: 'classique',
    name: 'Classique',
    price: 20000,
    maxGuests: 300,
    storageGb: 50,
    retentionDays: 30,
    maxVoiceSeconds: 120,
    features: ['galerie', 'livreOrEcrit', 'livreOrVocal', 'qrCodes', 'exportComplet'],
    pitch: 'Les souvenirs, plus le contrôle des entrées le jour J.',
  },
  prestige: {
    id: 'prestige',
    name: 'Prestige',
    // PRIX DE TEST : remettre 25000 avant d'ouvrir au public
    price: 100,
    maxGuests: 500,
    storageGb: 100,
    retentionDays: 45,
    maxVoiceSeconds: 120,
    features: ['galerie', 'livreOrEcrit', 'livreOrVocal', 'qrCodes', 'exportComplet', 'livreOrPdf'],
    pitch: 'Tout, pour les grandes fêtes.',
  },
};

export const PLAN_ORDER: PlanId[] = ['essentiel', 'classique', 'prestige'];

export const FEATURE_LABELS: Record<Feature, string> = {
  galerie: 'Galerie photos et vidéos en qualité originale',
  livreOrEcrit: 'Livre d’or écrit',
  livreOrVocal: 'Messages vocaux de 2 minutes',
  qrCodes: 'QR code personnel et contrôle des entrées',
  exportComplet: 'Téléchargement de tous les souvenirs en ZIP',
  livreOrPdf: 'Livre d’or en PDF',
  miniSite: 'Mini-site souvenir lisible sans Internet',
  photographe: 'Accès photographe ou vidéaste',
  plusieursEspaces: 'Accès séparés : cérémonie, dîner, autres',
};

export function hasFeature(planId: PlanId, f: Feature): boolean {
  return PLANS[planId].features.includes(f);
}

export function quotaBytes(planId: PlanId): number {
  return PLANS[planId].storageGb * 1024 ** 3;
}
