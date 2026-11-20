
import 'server-only';

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import {
  AggregateField,
  FieldPath,
  getFirestore,
  type DocumentData,
  type Firestore,
  type Query,
} from 'firebase-admin/firestore';

import type {
  LastMessage,
  Agent,
  Checkin,
  EventSpace,
  Group,
  Guest,
  GuestbookEntry,
  Media,
  MediaKind,
  Message,
  Order,
  Payment,
  Product,
  Upload,
  UploadPart,
  User,
  Vendor,
} from '@/lib/types';

// ============================================================
// FIRESTORE
// ============================================================

const globalForFirestore = globalThis as typeof globalThis & {
  __kanuFirestore?: Firestore;
};

function firestore(): Firestore {
  if (globalForFirestore.__kanuFirestore) {
    return globalForFirestore.__kanuFirestore;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Configuration Firestore incomplète : vérifiez FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL et FIREBASE_PRIVATE_KEY.',
    );
  }

  const appName = 'kanu-firestore';

  const app =
    getApps().find((existingApp) => existingApp.name === appName) ??
    initializeApp(
      {
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        projectId,
      },
      appName,
    );

  const db = getFirestore(app);

  db.settings({
    ignoreUndefinedProperties: true,
  });

  globalForFirestore.__kanuFirestore = db;

  return db;
}

// ============================================================
// OUTILS COMMUNS
// ============================================================

const col = (name: string) => firestore().collection(name);

const byDateDesc = <T extends { createdAt: string }>(a: T, b: T) =>
  b.createdAt.localeCompare(a.createdAt);

async function getOne<T>(name: string, id: string): Promise<T | null> {
  if (!id) return null;

  const snap = await col(name).doc(id).get();

  return snap.exists ? (snap.data() as T) : null;
}

async function findOne<T>(q: Query<DocumentData>): Promise<T | null> {
  const snap = await q.limit(1).get();

  return snap.empty ? null : (snap.docs[0].data() as T);
}

async function findAll<T>(q: Query<DocumentData>): Promise<T[]> {
  const snap = await q.get();

  return snap.docs.map((doc) => doc.data() as T);
}

async function put<T extends { id: string }>(
  name: string,
  obj: T,
): Promise<T> {
  if (!obj.id || !obj.id.trim()) {
    throw new Error(
      `Impossible d'enregistrer un document sans identifiant dans ${name}.`,
    );
  }

  await col(name).doc(obj.id).set(obj);

  return obj;
}

async function patch<T>(
  name: string,
  id: string,
  data: Partial<T>,
): Promise<T | null> {
  if (!id) return null;

  const ref = col(name).doc(id);
  const snap = await ref.get();

  if (!snap.exists) return null;

  const safeData = { ...data } as Record<string, unknown>;
  delete safeData.id;

  await ref.set(safeData, { merge: true });

  return {
    ...(snap.data() as T),
    ...safeData,
  } as T;
}

async function removeOne<T>(name: string, id: string): Promise<T | null> {
  if (!id) return null;

  const ref = col(name).doc(id);
  const snap = await ref.get();

  if (!snap.exists) return null;

  await ref.delete();

  return snap.data() as T;
}

async function removeWhere(q: Query<DocumentData>): Promise<void> {
  while (true) {
    const snap = await q.limit(400).get();

    if (snap.empty) break;

    const batch = firestore().batch();

    for (const doc of snap.docs) {
      batch.delete(doc.ref);
    }

    await batch.commit();

    if (snap.size < 400) break;
  }
}

// ============================================================
// UTILISATEURS
// ============================================================

export const users = {
  async create(u: User) {
    return put('users', u);
  },

  async byPhone(phone: string) {
    return findOne<User>(
      col('users').where('phone', '==', phone),
    );
  },

  async byId(id: string) {
    return getOne<User>('users', id);
  },

  async all() {
    return (await findAll<User>(col('users'))).sort(byDateDesc);
  },

  async update(id: string, data: Partial<User>) {
    return patch<User>('users', id, data);
  },
};

// ============================================================
// ESPACES : MARIAGES, BAPTÊMES
// ============================================================

export const events = {
  async create(e: EventSpace) {
    return put('events', e);
  },

  async byId(id: string) {
    return getOne<EventSpace>('events', id);
  },

  async bySlug(slug: string) {
    return findOne<EventSpace>(
      col('events').where('slug', '==', slug),
    );
  },

  async byCode(code: string) {
    return findOne<EventSpace>(
      col('events').where('code', '==', code.trim().toUpperCase()),
    );
  },

  async byOwner(ownerId: string) {
    return (
      await findAll<EventSpace>(
        col('events').where('ownerId', '==', ownerId),
      )
    ).sort(byDateDesc);
  },

  async all() {
    return (await findAll<EventSpace>(col('events'))).sort(byDateDesc);
  },

  async update(id: string, data: Partial<EventSpace>) {
    return patch<EventSpace>('events', id, data);
  },
};

// ============================================================
// INVITÉS
// ============================================================

export const guests = {
  async create(gst: Guest) {
    return put('guests', gst);
  },

  async byId(id: string) {
    return getOne<Guest>('guests', id);
  },

  async byToken(token: string) {
    return findOne<Guest>(
      col('guests').where('token', '==', token),
    );
  },

  async list(eventId: string) {
    return (
      await findAll<Guest>(
        col('guests').where('eventId', '==', eventId),
      )
    ).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  },

  async seatCount(eventId: string) {
    const list = await findAll<Guest>(
      col('guests').where('eventId', '==', eventId),
    );

    return list.reduce((total, guest) => total + guest.seats, 0);
  },

  async update(id: string, data: Partial<Guest>) {
    return patch<Guest>('guests', id, data);
  },

  async remove(id: string) {
    await col('guests').doc(id).delete();

    await removeWhere(
      col('checkins').where('guestId', '==', id),
    );
  },
};

// ============================================================
// AGENTS DE CONTRÔLE
// ============================================================

export const agents = {
  async create(a: Agent) {
    return put('agents', a);
  },

  async byId(id: string) {
    return getOne<Agent>('agents', id);
  },

  async byPin(eventId: string, pin: string) {
    return findOne<Agent>(
      col('agents')
        .where('eventId', '==', eventId)
        .where('pin', '==', pin),
    );
  },

  async list(eventId: string) {
    return (
      await findAll<Agent>(
        col('agents').where('eventId', '==', eventId),
      )
    ).sort(byDateDesc);
  },

  async remove(id: string) {
    await col('agents').doc(id).delete();
  },
};

// ============================================================
// MÉDIAS
// ============================================================

export const media = {
  async create(m: Media) {
    return put('media', m);
  },

  async byId(id: string) {
    return getOne<Media>('media', id);
  },

  async list(eventId: string, kinds?: MediaKind[]) {
    const list = await findAll<Media>(
      col('media').where('eventId', '==', eventId),
    );

    return list
      .filter((m) => !kinds || kinds.includes(m.kind))
      .sort(byDateDesc);
  },

  async bytesUsed(eventId: string) {
    const [list, pending] = await Promise.all([
      findAll<Media>(
        col('media').where('eventId', '==', eventId),
      ),
      findAll<Upload>(
        col('uploads').where('eventId', '==', eventId),
      ),
    ]);

    const stored = list
      .filter((m) => m.kind !== 'cover')
      .reduce((total, m) => total + m.size, 0);

    const reserved = pending.reduce(
      (total, u) => total + u.size,
      0,
    );

    return { stored, reserved };
  },

  async usageByKind(eventId: string) {
    const out = {
      photo: 0,
      video: 0,
      audio: 0,
    };

    const list = await findAll<Media>(
      col('media').where('eventId', '==', eventId),
    );

    for (const m of list) {
      if (m.kind !== 'cover') {
        out[m.kind] += m.size;
      }
    }

    return out;
  },

  async update(id: string, data: Partial<Media>) {
    return patch<Media>('media', id, data);
  },

  async remove(id: string) {
    return removeOne<Media>('media', id);
  },

  async totalBytes() {
    const snap = await col('media')
      .aggregate({
        total: AggregateField.sum('size'),
      })
      .get();

    return snap.data().total || 0;
  },
};

// ============================================================
// ENVOIS EN COURS — CLOUDFLARE R2 MULTIPART
// ============================================================

export const uploads = {
  async create(u: Upload) {
    return put('uploads', {
      ...u,
      uploadedParts: u.uploadedParts ?? [],
    });
  },

  async byId(id: string) {
    return getOne<Upload>('uploads', id);
  },

  async setReceived(id: string, received: number) {
    if (!Number.isSafeInteger(received) || received < 0) {
      throw new Error('Nombre d’octets reçus invalide.');
    }

    return patch<Upload>('uploads', id, { received });
  },

  async setMultipart(
    id: string,
    data: {
      r2UploadId: string;
      storageKey: string;
    },
  ) {
    if (!data.r2UploadId || !data.storageKey) {
      throw new Error('Informations multipart R2 invalides.');
    }

    return patch<Upload>( 'uploads', id, {
      r2UploadId: data.r2UploadId,
      storageKey: data.storageKey,
    });
  },

  async addPart(id: string, part: UploadPart) {
    if (
      !Number.isInteger(part.partNumber) ||
      part.partNumber < 1 ||
      !part.etag ||
      !Number.isSafeInteger(part.size) ||
      part.size <= 0
    ) {
      throw new Error('Partie multipart invalide.');
    }

    const ref = col('uploads').doc(id);

    return firestore().runTransaction(async (tx) => {
      const snap = await tx.get(ref);

      if (!snap.exists) return null;

      const upload = snap.data() as Upload;
      const parts = upload.uploadedParts ?? [];

      const updated = [
        ...parts.filter((p) => p.partNumber !== part.partNumber),
        part,
      ].sort((a, b) => a.partNumber - b.partNumber);

      const received = updated.reduce((total, p) => total + p.size, 0);

      if (received > upload.size) {
        throw new Error('La taille reçue dépasse la taille annoncée.');
      }

      tx.update(ref, {
        uploadedParts: updated,
        received,
      });

      return {
        ...upload,
        uploadedParts: updated,
        received,
      } as Upload;
    });
  },

  async remove(id: string) {
    if (!id) return;

    await col('uploads').doc(id).delete();
  },
};

// ============================================================
// LIVRE D'OR
// ============================================================

export const guestbook = {
  async create(e: GuestbookEntry) {
    return put('guestbook', e);
  },

  async byId(id: string) {
    return getOne<GuestbookEntry>('guestbook', id);
  },

  async list(eventId: string) {
    return (
      await findAll<GuestbookEntry>(
        col('guestbook').where('eventId', '==', eventId),
      )
    ).sort(byDateDesc);
  },

  async remove(id: string) {
    return removeOne<GuestbookEntry>('guestbook', id);
  },
};

// ============================================================
// ENTRÉES : CONTRÔLE QR
// ============================================================

export const checkins = {
  async create(c: Checkin) {
    const ref = col('checkins').doc(
      `${c.eventId}_${c.guestId}_${c.zoneId}`,
    );

    return firestore().runTransaction(async (tx) => {
      const snap = await tx.get(ref);

      if (snap.exists) {
        return {
          checkin: snap.data() as Checkin,
          duplicate: true,
        };
      }

      tx.set(ref, c);

      return {
        checkin: c,
        duplicate: false,
      };
    });
  },

  async list(eventId: string) {
    return (
      await findAll<Checkin>(
        col('checkins').where('eventId', '==', eventId),
      )
    ).sort((a, b) => b.at.localeCompare(a.at));
  },
};

// ============================================================
// PAIEMENTS
// ============================================================

export const payments = {
  async create(p: Payment) {
    return put('payments', p);
  },

  async byId(id: string) {
    return getOne<Payment>('payments', id);
  },

  async byEvent(eventId: string) {
    return (
      await findAll<Payment>(
        col('payments').where('eventId', '==', eventId),
      )
    ).sort(byDateDesc);
  },

  async all() {
    return (await findAll<Payment>(col('payments'))).sort(byDateDesc);
  },

  async update(id: string, data: Partial<Payment>) {
    return patch<Payment>('payments', id, data);
  },
};

// ============================================================
// GROUPES DE DISCUSSION
// ============================================================

export const groups = {
  async create(gr: Group) {
    return put('groups', gr);
  },

  async byId(id: string) {
    return getOne<Group>('groups', id);
  },

  async byEvent(eventId: string) {
    return findAll<Group>(
      col('groups').where('eventId', '==', eventId),
    );
  },

  async update(id: string, data: Partial<Group>) {
    return patch<Group>('groups', id, data);
  },

  async markRead(id: string, key: string, at: string) {
    try {
      await col('groups')
        .doc(id)
        .update(new FieldPath('reads', key), at);
    } catch (error) {
      const code = String(
        (error as { code?: string | number }).code ?? '',
      );

      if (code !== '5' && code !== 'not-found') {
        throw error;
      }
    }
  },

  /** Marque tous les messages du groupe comme lus par ce membre */
  async markReadCount(id: string, key: string, count: number) {
    try {
      await col('groups').doc(id).update(new FieldPath('readCounts', key), count);
    } catch (error) {
      const code = String((error as { code?: string | number }).code ?? '');
      if (code !== '5' && code !== 'not-found') throw error;
    }
  },

  /**
   * Groupes créés avant cette version : calcule une seule fois le résumé
   * (nombre de messages, dernier message). Les messages existants sont
   * considérés comme lus par ceux qui avaient déjà ouvert le groupe.
   */
  async ensureSummary(id: string) {
    const ref = col('groups').doc(id);
    const snap = await ref.get();
    const g = snap.data() as Group | undefined;
    if (!g || g.msgCount !== undefined) return g ?? null;
    const [countSnap, last] = await Promise.all([
      col('messages').where('groupId', '==', id).count().get(),
      messages.last(id),
    ]);
    const msgCount = countSnap.data().count;
    const readCounts: Record<string, number> = {};
    for (const k of Object.keys(g.reads || {})) readCounts[k] = msgCount;
    const upd = { msgCount, readCounts, rev: 1, ...(last ? { last: lastOf(last) } : {}) };
    await ref.set(upd, { merge: true });
    return { ...g, ...upd } as Group;
  },

  async remove(id: string) {
    await col('groups').doc(id).delete();

    await removeWhere(
      col('messages').where('groupId', '==', id),
    );
  },
};

// ============================================================
// MESSAGES
// ============================================================

const groupMessages = (groupId: string) =>
  col('messages')
    .where('groupId', '==', groupId)
    .orderBy('createdAt', 'asc');

/** Clé du membre qui a écrit le message ('owner', id de l'invité, ou null pour Kanu) */
export const authorKeyOf = (m: Message) => (m.author.id === 'systeme' ? null : m.author.kind === 'owner' ? 'owner' : m.author.id);

/** Résumé d'un message pour la liste des discussions */
export function lastOf(m: Message): LastMessage {
  return {
    id: m.id,
    kind: m.author.id === 'systeme' ? 'systeme' : m.deleted ? 'supprime' : m.audio ? 'vocal' : 'texte',
    text: m.deleted ? '' : m.text.slice(0, 120),
    author: m.author.name,
    authorKey: authorKeyOf(m) || 'systeme',
    seconds: m.audio?.seconds,
    at: m.createdAt,
  };
}

export const messages = {
  /**
   * Enregistre un message ET met à jour le résumé du groupe (dernier message,
   * nombre de messages, lu par l'auteur) dans une seule transaction.
   * La liste des discussions n'a ensuite qu'à lire les groupes : très rapide.
   */
  async create(m: Message) {
    await groups.ensureSummary(m.groupId);
    const gref = col('groups').doc(m.groupId);
    await firestore().runTransaction(async (tx) => {
      const snap = await tx.get(gref);
      const g = snap.data() as Group | undefined;
      const count = (g?.msgCount ?? 0) + 1;
      const key = authorKeyOf(m);
      const readCounts = { ...(g?.readCounts || {}) };
      if (key) readCounts[key] = count;
      tx.set(col('messages').doc(m.id), m);
      tx.set(
        gref,
        { updatedAt: m.createdAt, msgCount: count, rev: (g?.rev ?? 0) + 1, last: lastOf(m), readCounts },
        { merge: true },
      );
    });
    return m;
  },

  async byId(id: string) {
    return getOne<Message>('messages', id);
  },

  /** Modifier ou supprimer un message (et prévenir les autres membres) */
  async update(m: Message, data: Partial<Message>) {
    const next = { ...m, ...data };
    const gref = col('groups').doc(m.groupId);
    await firestore().runTransaction(async (tx) => {
      const snap = await tx.get(gref);
      const g = snap.data() as Group | undefined;
      tx.set(col('messages').doc(m.id), next);
      const upd: Record<string, unknown> = { rev: (g?.rev ?? 0) + 1 };
      if (g?.last?.id === m.id) upd.last = lastOf(next);
      tx.set(gref, upd, { merge: true });
    });
    return next;
  },

  async list(
    groupId: string,
    opts: { after?: string; limit?: number } = {},
  ) {
    let q = groupMessages(groupId);

    if (opts.after) {
      q = q.where('createdAt', '>', opts.after);
    }

    if (opts.limit && opts.limit > 0) {
      q = q.limitToLast(Math.floor(opts.limit));
    }

    return findAll<Message>(q);
  },

  /** Les messages plus anciens qu'une date (pour remonter dans la discussion) */
  async before(groupId: string, before: string, limit: number) {
    return findAll<Message>(groupMessages(groupId).where('createdAt', '<', before).limitToLast(limit));
  },

  async last(groupId: string) {
    const list = await findAll<Message>(
      groupMessages(groupId).limitToLast(1),
    );

    return list[0] ?? null;
  },

  async countAfter(
    groupId: string,
    after: string | undefined,
    exceptKey: string,
  ) {
    let q = groupMessages(groupId);

    if (after) {
      q = q.where('createdAt', '>', after);
    }

    const list = await findAll<Message>(q);

    return list.filter(
      (m) =>
        (m.author.kind === 'owner' ? 'owner' : m.author.id) !==
        exceptKey,
    ).length;
  },
};

// ============================================================
// BOUTIQUE : VENDEURS
// ============================================================

export const vendors = {
  async create(v: Vendor) {
    return put('vendors', v);
  },

  async byId(id: string) {
    return getOne<Vendor>('vendors', id);
  },

  async byUser(userId: string) {
    return findOne<Vendor>(
      col('vendors').where('userId', '==', userId),
    );
  },

  async all() {
    return (await findAll<Vendor>(col('vendors'))).sort(byDateDesc);
  },

  async update(id: string, data: Partial<Vendor>) {
    return patch<Vendor>('vendors', id, data);
  },
};

// ============================================================
// BOUTIQUE : PRODUITS
// ============================================================

export const products = {
  async create(p: Product) {
    return put('products', p);
  },

  async byId(id: string) {
    return getOne<Product>('products', id);
  },

  async byVendor(vendorId: string) {
    return (
      await findAll<Product>(
        col('products').where('vendorId', '==', vendorId),
      )
    ).sort(byDateDesc);
  },

  async catalog(opts: { category?: string; q?: string } = {}) {
    const [okVendors, list] = await Promise.all([
      findAll<Vendor>(
        col('vendors').where('status', '==', 'valide'),
      ),
      findAll<Product>(
        col('products').where('active', '==', true),
      ),
    ]);

    const ok = new Set(okVendors.map((v) => v.id));
    const q = opts.q?.trim().toLowerCase();

    return list
      .filter(
        (p) =>
          ok.has(p.vendorId) &&
          (!opts.category || p.category === opts.category) &&
          (
            !q ||
            (p.name ?? '').toLowerCase().includes(q) ||
            (p.description ?? '').toLowerCase().includes(q)
          ),
      )
      .sort(byDateDesc);
  },

  async update(id: string, data: Partial<Product>) {
    return patch<Product>('products', id, data);
  },

  async remove(id: string) {
    await col('products').doc(id).delete();
  },
};

// ============================================================
// BOUTIQUE : COMMANDES
// ============================================================

export const orders = {
  async create(o: Order) {
    return put('orders', o);
  },

  async byId(id: string) {
    return getOne<Order>('orders', id);
  },

  async byBuyer(buyerId: string) {
    return (
      await findAll<Order>(
        col('orders').where('buyerId', '==', buyerId),
      )
    ).sort(byDateDesc);
  },

  async byVendor(vendorId: string) {
    return (
      await findAll<Order>(
        col('orders').where('vendorId', '==', vendorId),
      )
    ).sort(byDateDesc);
  },

  async all() {
    return (await findAll<Order>(col('orders'))).sort(byDateDesc);
  },

  async update(id: string, data: Partial<Order>) {
    return patch<Order>('orders', id, data);
  },
};
