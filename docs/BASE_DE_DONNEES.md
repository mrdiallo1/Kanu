# Schéma de la base de données

Ce schéma correspond aux types de `src/lib/types.ts`, exprimé en SQL (PostgreSQL). Adaptez-le à votre base. Ensuite, réécrivez les fonctions de `src/lib/db/index.ts` avec ces tables.

```sql
create table users (
  id            uuid primary key,
  name          text not null,
  phone         text not null unique,      -- sans indicatif +223
  password_hash text not null,             -- format sel:hash (scrypt)
  suspended     boolean not null default false,
  created_at    timestamptz not null default now()
);

create table events (
  id               uuid primary key,
  slug             text not null unique,
  code             text not null unique,   -- code d'invitation, ex. K7M-4QP
  type             text not null check (type in ('mariage','bapteme')),
  owner_id         uuid not null references users(id),
  host_a           text not null,          -- mariée / père
  host_b           text not null,          -- marié / mère
  baby_name        text,                   -- baptême
  date             date not null,
  time             text not null,          -- HH:MM
  ceremony_place   text not null default '',
  reception_place  text not null default '',
  program          jsonb not null default '[]',   -- [{time,label}]
  story            text not null default '',
  welcome          text not null default '',
  plan             text not null check (plan in ('essentiel','classique','prestige')),
  status           text not null check (status in ('brouillon','actif','ferme','suspendu')),
  paid_at          timestamptz,
  zones            jsonb not null,         -- [{id,name,singleEntry,openToAll}]
  settings         jsonb not null,         -- {guestsCanPost, guestsCanDeleteOwn}
  cover_media_id   uuid,
  created_at       timestamptz not null default now()
);
create index on events(owner_id);

create table guests (
  id           uuid primary key,
  event_id     uuid not null references events(id) on delete cascade,
  name         text not null,
  phone        text,
  seats        int  not null default 1,
  token        text not null unique,       -- secret du QR code et du lien personnel
  access       text[] not null default '{}',  -- identifiants de zones
  role         text not null default 'invite' check (role in ('invite','photographe')),
  blocked      boolean not null default false,
  can_post     boolean not null default true,
  source       text not null check (source in ('liste','code')),
  rsvp         text not null default 'attente' check (rsvp in ('attente','oui','non')),
  joined_at    timestamptz,
  last_seen_at timestamptz,
  created_at   timestamptz not null default now()
);
create index on guests(event_id);

create table agents (
  id         uuid primary key,
  event_id   uuid not null references events(id) on delete cascade,
  name       text not null,
  pin        text not null,
  created_at timestamptz not null default now(),
  unique (event_id, pin)
);

create table media (
  id            uuid primary key,
  event_id      uuid not null references events(id) on delete cascade,
  guest_id      uuid references guests(id) on delete set null,
  by_owner      boolean not null default false,
  author_name   text not null,
  kind          text not null check (kind in ('photo','video','audio','cover')),
  mime          text not null,
  size          bigint not null,
  original_name text not null,
  storage_key   text not null,
  thumb_key     text,
  caption       text,
  official      boolean not null default false,
  reported      int not null default 0,
  created_at    timestamptz not null default now()
);
create index on media(event_id, created_at desc);

-- Envois en cours : leur taille est réservée dans le quota
create table uploads (
  id              uuid primary key,
  event_id        uuid not null references events(id) on delete cascade,
  guest_id        uuid,
  by_owner        boolean not null default false,
  author_name     text not null,
  kind            text not null,
  mime            text not null,
  size            bigint not null,
  received        bigint not null default 0,
  original_name   text not null,
  caption         text,
  official        boolean not null default false,
  guestbook_text  text,
  created_at      timestamptz not null default now()
);

create table guestbook (
  id             uuid primary key,
  event_id       uuid not null references events(id) on delete cascade,
  guest_id       uuid references guests(id) on delete set null,
  author_name    text not null,
  text           text,
  audio_media_id uuid references media(id) on delete cascade,
  created_at     timestamptz not null default now()
);
create index on guestbook(event_id, created_at desc);

create table checkins (
  id        uuid primary key,
  event_id  uuid not null references events(id) on delete cascade,
  guest_id  uuid not null references guests(id) on delete cascade,
  zone_id   text not null,
  agent_id  uuid not null,
  at        timestamptz not null,
  unique (event_id, guest_id, zone_id)    -- une seule entrée par espace
);

create table payments (
  id         uuid primary key,
  event_id   uuid not null references events(id),
  user_id    uuid not null references users(id),
  plan       text not null,
  amount     int  not null,               -- FCFA
  method     text not null,               -- orange, moov, wave, carte
  phone      text,
  provider   text not null,
  reference  text not null unique,
  status     text not null check (status in ('en_attente','paye','echoue')),
  created_at timestamptz not null default now(),
  paid_at    timestamptz
);
```

Points d’attention :

- `checkins.create` doit être atomique. Avec la contrainte `unique`, utilisez `insert … on conflict do nothing returning *`, puis relisez la ligne existante si rien n’a été inséré.
- `media.bytesUsed` additionne les médias stockés (`kind <> 'cover'`) et les envois en cours (`uploads`).
- Supprimez de temps en temps les `uploads` abandonnés depuis plus de 24 h, ainsi que leurs fichiers temporaires.
