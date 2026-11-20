
import type { PlanId } from '@/config/plans';

export type EventType = 'mariage' | 'bapteme';
export type EventStatus = 'brouillon' | 'actif' | 'ferme' | 'suspendu';

export interface User {
  id: string;
  name: string;
  phone: string;
  passwordHash: string;
  createdAt: string;
  suspended?: boolean;
}

export interface Zone {
  id: string;
  name: string;
  singleEntry: boolean;
  openToAll: boolean;
}

export interface ProgramItem {
  time: string;
  label: string;
}

export interface EventSpace {
  id: string;
  slug: string;
  code: string;
  type: EventType;
  ownerId: string;
  hostA: string;
  hostB: string;
  babyName?: string;
  date: string;
  time: string;
  ceremonyPlace: string;
  receptionPlace: string;
  program: ProgramItem[];
  story: string;
  welcome: string;
  plan: PlanId;
  status: EventStatus;
  paidAt?: string;
  zones: Zone[];
  settings: {
    guestsCanPost: boolean;
    guestsCanDeleteOwn: boolean;
  };
  coverMediaId?: string;
  createdAt: string;
}

export type GuestRole = 'invite' | 'photographe';

export interface Guest {
  id: string;
  eventId: string;
  name: string;
  phone?: string;
  seats: number;
  token: string;
  access: string[];
  role: GuestRole;
  blocked: boolean;
  canPost: boolean;
  source: 'liste' | 'code';
  rsvp: 'attente' | 'oui' | 'non';
  canCreateGroups?: boolean;
  joinedAt?: string;
  lastSeenAt?: string;
  createdAt: string;
}

export interface Agent {
  id: string;
  eventId: string;
  name: string;
  pin: string;
  createdAt: string;
}

export type MediaKind = 'photo' | 'video' | 'audio' | 'cover';

export interface Media {
  id: string;
  eventId: string;
  guestId?: string;
  byOwner?: boolean;
  authorName: string;
  kind: MediaKind;
  mime: string;
  size: number;
  originalName: string;
  storageKey: string;
  thumbKey?: string;
  caption?: string;
  official?: boolean;
  reported?: number;
  createdAt: string;
}

export interface GuestbookEntry {
  id: string;
  eventId: string;
  guestId?: string;
  authorName: string;
  text?: string;
  audioMediaId?: string;
  createdAt: string;
}

export interface Checkin {
  id: string;
  eventId: string;
  guestId: string;
  zoneId: string;
  agentId: string;
  at: string;
}

export interface Payment {
  id: string;
  eventId: string;
  userId: string;
  plan: PlanId;
  amount: number;
  method: string;
  phone?: string;
  provider: string;
  reference: string;
  status: 'en_attente' | 'paye' | 'echoue';
  createdAt: string;
  paidAt?: string;
}

/** Une partie d'un envoi multipart stockée dans Cloudflare R2. */
export interface UploadPart {
  partNumber: number;
  etag: string;
  size: number;
}

export interface Upload {
  id: string;
  eventId: string;
  guestId?: string;
  byOwner?: boolean;
  authorName: string;
  kind: 'photo' | 'video' | 'audio';
  mime: string;
  size: number;
  received: number;
  originalName: string;
  caption?: string;
  official?: boolean;
  guestbookText?: string;
  createdAt: string;

  /** Identifiant renvoyé par CreateMultipartUpload de R2. */
  r2UploadId?: string;

  /** Clé définitive prévue pour le fichier dans R2. */
  storageKey?: string;

  /** Parties déjà enregistrées dans R2. */
  uploadedParts?: UploadPart[];
}

export interface Member {
  kind: 'owner' | 'guest';
  id: string;
}

export interface Group {
  id: string;
  eventId: string;
  name: string;
  description?: string;
  createdBy: Member;
  adminGuestIds: string[];
  memberGuestIds: string[];
  reads: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  // ---- Résumé tenu à jour à chaque message (pour un affichage rapide) ----
  /** Nombre total de messages du groupe */
  msgCount?: number;
  /** Nombre de messages déjà lus, par membre ('owner' ou id de l'invité) */
  readCounts?: Record<string, number>;
  /** Dernier message, pour la liste des discussions */
  last?: LastMessage;
  /** Augmente à chaque nouveau message, modification ou suppression */
  rev?: number;
}

export interface LastMessage {
  id: string;
  kind: 'texte' | 'vocal' | 'supprime' | 'systeme';
  text: string;
  author: string;
  authorKey: string;
  seconds?: number;
  at: string;
}

export interface Message {
  id: string;
  groupId: string;
  eventId: string;
  author: Member & { name: string };
  text: string;
  createdAt: string;
  /** Message vocal (fichier sur R2) */
  audio?: { key: string; mime: string; seconds: number; size: number };
  /** Date de la dernière modification du texte */
  editedAt?: string;
  /** Message supprimé (« Ce message a été supprimé ») */
  deleted?: boolean;
}

export interface Vendor {
  id: string;
  userId: string;
  businessName: string;
  phone: string;
  city: string;
  description: string;
  status: 'en_attente' | 'valide' | 'suspendu';
  createdAt: string;
}

export interface Product {
  id: string;
  vendorId: string;
  name: string;
  description: string;
  category: string;
  price: number;
  unit: string;
  mode: 'vente' | 'location';
  stock: number;
  minQty: number;
  photos: string[];
  delivery: string;
  active: boolean;
  createdAt: string;
}

export type OrderStatus =
  | 'en_attente'
  | 'acceptee'
  | 'refusee'
  | 'en_preparation'
  | 'en_livraison'
  | 'livree'
  | 'terminee'
  | 'annulee';

export interface OrderItem {
  productId: string;
  name: string;
  unit: string;
  mode: 'vente' | 'location';
  price: number;
  qty: number;
}

export interface Order {
  id: string;
  reference: string;
  buyerId: string;
  buyerName: string;
  buyerPhone: string;
  eventId?: string;
  vendorId: string;
  items: OrderItem[];
  total: number;
  delivery: 'livraison' | 'retrait';
  address: string;
  neededOn: string;
  note: string;
  status: OrderStatus;
  history: { status: OrderStatus; at: string; note?: string }[];
  createdAt: string;
}

export interface Database {
  users: User[];
  events: EventSpace[];
  guests: Guest[];
  agents: Agent[];
  media: Media[];
  guestbook: GuestbookEntry[];
  checkins: Checkin[];
  payments: Payment[];
  uploads: Upload[];
  groups: Group[];
  messages: Message[];
  vendors: Vendor[];
  products: Product[];
  orders: Order[];
}
