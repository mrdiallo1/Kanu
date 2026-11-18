// Accueil du tableau de bord des mariés (pensé d'abord pour le téléphone).
//  1. La photo de couple (facultative) avec les prénoms et le compte à rebours en direct
//  2. Inviter : le code, l'aperçu du lien tel qu'il apparaît sur WhatsApp, les boutons d'envoi
//  3. Les chiffres clés
//  4. Les raccourcis vers chaque partie de l'espace
//  5. Le stockage

import Link from 'next/link';
import * as db from '@/lib/db';
import { owned } from '@/lib/page';
import { daysLeft, expiresAt, feature, storage, storageWarning } from '@/lib/access';
import { bytes, eventTitle, fcfa, longDate } from '@/lib/format';
import { inviteLink } from '@/lib/events';
import { PLANS } from '@/config/plans';
import { siteUrl } from '@/config/site';
import { ShareBox } from '@/components/ShareBox';
import { CoupleHero } from '@/components/CoupleHero';
import { Icon } from '@/components/Icon';

const styles = `
/* Sur l'accueil, le titre du haut est déjà dans la grande carte : on le cache */
body:has(.home) .dash-head > .row,
body:has(.home) .dash-head > h1 { display: none; }
body:has(.home) .dash-head { padding-top: 12px; }

.home { display: grid; gap: 18px; max-width: 760px; margin: 0 auto; }
.home h2 { font-size: 22px; letter-spacing: -0.02em; margin: 10px 0 -4px; }

/* ---------- 1. Carte du couple ---------- */
.ch {
  position: relative; overflow: hidden;
  border-radius: 28px; min-height: 400px;
  background: var(--orange); color: #fff;
  display: flex; flex-direction: column; justify-content: space-between;
  isolation: isolate;
}
.ch::before {                       /* soleil décoratif quand il n'y a pas de photo */
  content: ''; position: absolute; z-index: -1;
  width: 420px; height: 420px; border-radius: 50%;
  right: -140px; top: -160px; background: #ff7a2e;
}
.ch::after {
  content: ''; position: absolute; z-index: -1;
  width: 220px; height: 220px; border-radius: 50%;
  right: 40px; top: 120px; background: #ff8f4f; opacity: .55;
}
.ch.has-photo::before, .ch.has-photo::after { display: none; }
.ch-bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: -2; }
.ch.has-photo .ch-body { background: linear-gradient(to top, rgba(20,10,4,.88) 0%, rgba(20,10,4,.55) 55%, rgba(20,10,4,0) 100%); }
.ch-top { display: flex; justify-content: flex-end; padding: 14px; }
.ch-photo-actions { display: flex; gap: 6px; }
.ch-chip {
  display: inline-flex; align-items: center; gap: 6px;
  height: 36px; padding: 0 12px; border-radius: 999px; border: 0;
  background: rgba(0,0,0,.42); color: #fff; font-weight: 650; font-size: 14px; cursor: pointer;
  backdrop-filter: blur(8px);
}
.ch-body { padding: 70px 22px 22px; }
.ch-names {
  font-family: var(--display); font-weight: 800; font-variation-settings: 'wdth' 78;
  font-size: 54px; line-height: .9; letter-spacing: -0.045em;
}
.ch-names span { display: block; }
.ch-date { margin-top: 10px; font-weight: 600; font-size: 16px; opacity: .95; }
.ch-count { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 18px; }
.ch-count div {
  background: rgba(255,255,255,.18); border: 1px solid rgba(255,255,255,.28);
  border-radius: 16px; padding: 10px 4px 8px; text-align: center;
  backdrop-filter: blur(10px);
}
.ch-count b { display: block; font-family: var(--display); font-weight: 800; font-size: 32px; line-height: 1; font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
.ch-count span { font-size: 12px; font-weight: 600; opacity: .9; }
.ch-done { margin-top: 18px; font-family: var(--display); font-weight: 750; font-size: 26px; }
.ch-add {
  display: flex; gap: 12px; align-items: center; margin-top: 18px;
  padding: 12px 14px; border-radius: 16px; border: 1.5px dashed rgba(255,255,255,.8);
  cursor: pointer;
}
.ch-add .ic { width: 42px; height: 42px; flex: none; border-radius: 12px; background: #fff; color: var(--orange-fonce); display: grid; place-items: center; }
.ch-add b { display: block; font-size: 16px; }
.ch-add small { font-size: 13px; opacity: .9; }
.ch-error { margin-top: 10px; background: rgba(0,0,0,.35); padding: 8px 12px; border-radius: 10px; font-size: 14px; }

/* ---------- 2. Inviter ---------- */
.inv { background: #fff; border: 1.5px solid var(--trait); border-radius: 24px; padding: 18px; display: grid; gap: 14px; }
.inv-code { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
.inv-code small { display: block; font-size: 13.5px; color: var(--encre-3); }
.inv-code b { font-family: var(--display); font-weight: 800; font-size: 34px; letter-spacing: .05em; line-height: 1.1; }
.inv .row .btn { flex: 1; }

/* Aperçu du lien tel qu'il s'affiche dans WhatsApp */
.wa { background: #e7f6dc; border-radius: 14px; padding: 6px; max-width: 360px; }
.wa-card { background: #d9efc9; border-radius: 10px; overflow: hidden; }
.wa-card img { display: block; width: 100%; aspect-ratio: 1200 / 630; object-fit: cover; background: var(--orange); }
.wa-card div { padding: 8px 10px 10px; }
.wa-card b { display: block; font-size: 14px; color: #111; }
.wa-card span { display: block; font-size: 12.5px; color: #4b5a45; line-height: 1.35; }
.wa-card i { display: block; font-style: normal; font-size: 12px; color: #6b7a63; margin-top: 2px; }
.wa-label { font-size: 13px; color: var(--encre-3); }

/* ---------- 3. Chiffres clés ---------- */
.kpis { display: grid; grid-template-columns: repeat(2, 1fr); background: var(--sable); border-radius: 24px; overflow: hidden; }
.kpis div { padding: 16px 18px; }
.kpis div:nth-child(odd) { border-right: 1px solid #f3dccb; }
.kpis div:nth-child(-n+2) { border-bottom: 1px solid #f3dccb; }
.kpis b { display: block; font-family: var(--display); font-weight: 800; font-size: 32px; letter-spacing: -0.03em; line-height: 1.05; }
.kpis span { font-size: 14px; color: var(--encre-2); }

/* ---------- 4. Raccourcis ---------- */
.tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.tile {
  display: flex; flex-direction: column; gap: 12px;
  padding: 16px; border-radius: 20px; background: var(--sable);
  color: var(--encre); text-decoration: none; min-height: 128px;
  transition: transform .1s;
}
.tile:active { transform: scale(.98); }
.tile .ic { width: 44px; height: 44px; border-radius: 14px; background: #fff; color: var(--orange-fonce); display: grid; place-items: center; }
.tile.hot { background: var(--orange); color: #fff; }
.tile.hot .ic { background: rgba(255,255,255,.22); color: #fff; }
.tile.hot small { color: rgba(255,255,255,.9); }
.tile b { font-size: 16.5px; line-height: 1.2; margin-top: auto; }
.tile small { font-size: 13.5px; color: var(--encre-3); margin-top: -8px; }

/* ---------- 5. Stockage ---------- */
.store { border: 1.5px solid var(--trait); border-radius: 20px; padding: 16px; display: grid; gap: 10px; }
.store .head { display: flex; justify-content: space-between; gap: 10px; font-size: 15px; }
.store .track { height: 8px; border-radius: 8px; background: var(--trait); overflow: hidden; }
.store .track span { display: block; height: 100%; background: var(--orange); }
.store p { font-size: 14px; color: var(--encre-2); }

@media (min-width: 721px) {
  .ch { min-height: 460px; }
  .ch-names { font-size: 76px; }
  .ch-count b { font-size: 40px; }
  .kpis { grid-template-columns: repeat(4, 1fr); }
  .kpis div { border: 0 !important; border-right: 1px solid #f3dccb !important; }
  .kpis div:last-child { border-right: 0 !important; }
  .tiles { grid-template-columns: repeat(3, 1fr); }
}
`;

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ bienvenue?: string }>;
}) {
  const { event } = await owned(params);
  const { bienvenue } = await searchParams;
  const plan = PLANS[event.plan];
  const base = `/tableau/${event.id}`;
  const names = event.type === 'bapteme' ? [event.babyName || 'Bébé'] : [event.hostA, `& ${event.hostB}`];
  const coverUrl = event.coverMediaId ? `/api/medias/${event.coverMediaId}` : undefined;
  const target = `${event.date}T${event.time || '12:00'}:00`;
  const dateLabel = `${longDate(event.date)}, ${(event.time || '12:00').replace(':', ' h ')}`;

  // ---------- Espace pas encore payé ----------
  if (event.status === 'brouillon') {
    return (
      <div className="home">
        <style>{styles}</style>
        <CoupleHero eventId={event.id} names={names} dateLabel={dateLabel} target={target} coverUrl={coverUrl} />
        <div className="inv">
          <h2 style={{ margin: 0 }}>Il reste le paiement</h2>
          <p className="muted">Votre espace est prêt. Il s’ouvrira à vos invités dès que le paiement de {fcfa(plan.price)} sera validé.</p>
          <Link href={`/paiement/${event.id}`} className="btn block">
            Payer et ouvrir l’espace
          </Link>
        </div>
      </div>
    );
  }

  // ---------- Données ----------
  const [guests, checkins, media, book, groups, st] = await Promise.all([
    db.guests.list(event.id),
    db.checkins.list(event.id),
    db.media.list(event.id, ['photo', 'video']),
    db.guestbook.list(event.id),
    db.groups.byEvent(event.id),
    storage(event),
  ]);
  const seats = guests.reduce((n, g) => n + g.seats, 0);
  const entered = new Set(checkins.map((c) => c.guestId)).size;
  const qr = feature(event, 'qrCodes');
  const warn = storageWarning(st.percent);
  const left = daysLeft(event);
  const link = inviteLink(event);
  const place = event.receptionPlace || event.ceremonyPlace;
  const message =
    event.type === 'bapteme'
      ? `Vous êtes invités au baptême de ${event.babyName}, le ${longDate(event.date).toLowerCase()}. Toutes les infos, et l’endroit pour partager vos photos : ${link} (code ${event.code})`
      : `${event.hostA} et ${event.hostB} vous invitent à leur mariage, le ${longDate(event.date).toLowerCase()}. Programme, lieux et galerie photos : ${link} (code ${event.code})`;

  const tiles = [
    { href: `${base}/invites`, icon: 'users', label: 'Invités', sub: `${seats} sur ${plan.maxGuests}`, hot: true },
    ...(qr ? [{ href: `${base}/entrees`, icon: 'scan', label: 'Entrées', sub: `${entered} scannée${entered > 1 ? 's' : ''}` }] : []),
    { href: `${base}/galerie`, icon: 'photos', label: 'Photos', sub: `${media.length} publiée${media.length > 1 ? 's' : ''}` },
    { href: `/e/${event.slug}/discussions`, icon: 'chat', label: 'Discussions', sub: `${groups.length} groupe${groups.length > 1 ? 's' : ''}` },
    { href: `${base}/livre-or`, icon: 'book', label: 'Livre d’or', sub: `${book.length} message${book.length > 1 ? 's' : ''}` },
    { href: `${base}/souvenirs`, icon: 'download', label: 'Souvenirs', sub: 'Tout télécharger' },
    { href: '/boutique', icon: 'bag', label: 'Boutique', sub: 'Eau, riz, chaises…' },
    { href: '/boutique/commandes', icon: 'box', label: 'Mes commandes', sub: 'Suivi des livraisons' },
    { href: `${base}/reglages`, icon: 'settings', label: 'Réglages', sub: 'Infos, programme' },
    { href: `/e/${event.slug}`, icon: 'ticket', label: 'Espace invité', sub: 'Le voir comme eux' },
  ];

  return (
    <div className="home">
      <style>{styles}</style>

      {bienvenue && (
        <p className="alert ok" role="status">
          Paiement validé. {eventTitle(event)} est ouvert : envoyez le lien à vos invités.
        </p>
      )}

      {/* 1. Photo de couple + compte à rebours */}
      <CoupleHero eventId={event.id} names={names} dateLabel={dateLabel} target={target} coverUrl={coverUrl} />

      {/* 2. Inviter */}
      <section className="inv" aria-label="Inviter vos proches">
        <div className="inv-code">
          <div>
            <small>Code d’invitation</small>
            <b>{event.code}</b>
          </div>
        </div>
        <div>
          <div className="wa-label" style={{ marginBottom: 6 }}>
            Vos invités verront ceci sur WhatsApp
          </div>
          <div className="wa">
            <div className="wa-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/apercu/${event.slug}?v=${event.coverMediaId || 'sans-photo'}`} alt="Aperçu du lien d’invitation" />
              <div>
                <b>{eventTitle(event)}</b>
                <span>
                  {longDate(event.date)}
                  {place ? `, ${place}` : ''}
                </span>
                <i>{siteUrl().replace(/^https?:\/\//, '')}</i>
              </div>
            </div>
          </div>
        </div>
        <ShareBox link={link} message={message} light={false} />
      </section>

      {/* 3. Chiffres clés */}
      <section className="kpis" aria-label="En bref">
        <div>
          <b>{seats}</b>
          <span>invités</span>
        </div>
        <div>
          <b>{qr ? entered : guests.filter((g) => g.joinedAt).length}</b>
          <span>{qr ? 'entrés le jour J' : 'connectés'}</span>
        </div>
        <div>
          <b>{media.length}</b>
          <span>photos et vidéos</span>
        </div>
        <div>
          <b>{book.length}</b>
          <span>mots au livre d’or</span>
        </div>
      </section>

      {/* 4. Raccourcis */}
      <h2>Votre espace</h2>
      <nav className="tiles" aria-label="Sections">
        {tiles.map((t) => (
          <Link key={t.href} href={t.href} className={`tile${'hot' in t && t.hot ? ' hot' : ''}`}>
            <span className="ic">
              <Icon name={t.icon} />
            </span>
            <b>{t.label}</b>
            <small>{t.sub}</small>
          </Link>
        ))}
      </nav>

      {/* 5. Stockage */}
      <section className="store" aria-label="Stockage">
        <div className="head">
          <b>Stockage</b>
          <span className="muted">
            {bytes(st.stored)} sur {plan.storageGb} Go
          </span>
        </div>
        <div className="track" aria-hidden>
          <span style={{ width: `${Math.max(st.percent, st.stored ? 1 : 0)}%` }} />
        </div>
        <p>
          {left > 0
            ? `Vos souvenirs restent en ligne jusqu’au ${longDate(expiresAt(event).toISOString()).toLowerCase()}.`
            : 'La période de conservation est terminée.'}
        </p>
        {warn && <p className="alert info small">{warn}</p>}
      </section>
    </div>
  );
}
