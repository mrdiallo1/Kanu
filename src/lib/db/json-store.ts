// Stockage provisoire dans un fichier JSON (data/db.json).
// Il sert uniquement à faire tourner l'application avant le branchement
// de la vraie base de données. Ne l'utilisez pas en production :
// il ne supporte qu'un seul serveur à la fois.

import fs from 'node:fs';
import path from 'node:path';
import type { Database } from '@/lib/types';

const DATA_DIR = path.resolve(process.env.DATA_DIR || './data');
const FILE = path.join(DATA_DIR, 'db.json');

const empty = (): Database => ({
  users: [],
  events: [],
  guests: [],
  agents: [],
  media: [],
  guestbook: [],
  checkins: [],
  payments: [],
  uploads: [],
  groups: [],
  messages: [],
  vendors: [],
  products: [],
  orders: [],
});

type Holder = { data: Database | null; queue: Promise<unknown> };
const g = globalThis as unknown as { __kanuStore?: Holder };
const holder: Holder = (g.__kanuStore ??= { data: null, queue: Promise.resolve() });

function load(): Database {
  if (holder.data) return holder.data;
  try {
    const raw = fs.readFileSync(FILE, 'utf8');
    holder.data = { ...empty(), ...JSON.parse(raw) } as Database;
  } catch {
    holder.data = empty();
  }
  return holder.data;
}

function persist(data: Database) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, FILE);
}

/** Lecture : renvoie l'état courant (ne pas le modifier directement). */
export function read(): Database {
  return load();
}

/** Écriture : les modifications sont appliquées l'une après l'autre. */
export function write<T>(fn: (db: Database) => T): Promise<T> {
  const run = holder.queue.then(() => {
    const db = load();
    const result = fn(db);
    persist(db);
    return result;
  });
  holder.queue = run.catch(() => undefined);
  return run;
}
