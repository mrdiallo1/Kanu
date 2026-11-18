import Link from 'next/link';
import { redirect } from 'next/navigation';
import './invitation.css';
import * as db from '@/lib/db';
import { space } from '@/lib/space';
import { longDate, typeLabel } from '@/lib/format';
import { Logo } from '@/components/Logo';
import { Countdown } from '@/components/Countdown';
import { Rsvp } from '@/components/Rsvp';
import { Icon } from '@/components/Icon';

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ v?: string }>;
};

const maps = (q: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;

const hm = (t: string) => t.replace(':', ' h ');

export default async function Page({ params, searchParams }: Props) {
  const { v } = await searchParams;
  const { slug } = await params;

  if (v === 'galerie') redirect(`/e/${slug}/photos`);
  if (v === 'livre-or' || v === 'invitation') {
    redirect(`/e/${slug}/${v}`);
  }

  const { event, viewer } = await space(params);

  const bapteme = event.type === 'bapteme';
  const names = bapteme
    ? [event.babyName || 'Bébé']
    : [event.hostA, `& ${event.hostB}`];

  const [photoCount, bookCount] = await Promise.all([
    db.media.list(event.id, ['photo', 'video']).then((l) => l.length),
    db.guestbook.list(event.id).then((l) => l.length),
  ]);

  const hasCover = Boolean(event.coverMediaId);
  const coverUrl = hasCover
    ? `/api/medias/${encodeURIComponent(event.coverMediaId!)}`
    : '';

  return (
    <>
      <header className={`ev-cover${hasCover ? ' has-img' : ''}`}>
        {hasCover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="bg"
            src={coverUrl}
            alt={`Photo de couverture - ${names.join(' ')}`}
          />
        )}

        <div className="ev-cover-overlay" />

        <div className="ev-top-actions">
          <Logo onOrange href={`/e/${event.slug}`} />

          <span className="small ev-viewer">
            {viewer.name}
          </span>
        </div>

        <div className="ev-hero-content">
          <span className="ev-eyebrow">
            {bapteme ? 'UN MOMENT DE BONHEUR' : 'UN JOUR INOUBLIABLE'}
          </span>

          <div className="ev-type">
            {typeLabel(event.type)}
          </div>

          <h1>
            {names.map((name) => (
              <span key={name}>{name}</span>
            ))}
          </h1>

          <div className="ev-date">
            <span>{longDate(event.date)}</span>
            <span className="ev-date-separator">✦</span>
            <span>{hm(event.time)}</span>
          </div>

          <div className="ev-hero-bottom">
            <span>UN MOMENT UNIQUE À PARTAGER</span>
            <span>✦</span>
          </div>
        </div>
      </header>

      <main className="wrap ev-main">
        {event.welcome && (
          <section className="ev-welcome">
            <span className="ev-section-label">BIENVENUE</span>
            <p>{event.welcome}</p>
            <span className="ev-decoration">✦</span>
          </section>
        )}

        <section className="ev-sec ev-countdown">
          <div className="ev-section-heading">
            <span className="ev-section-label">LE GRAND JOUR APPROCHE</span>
            <h2>Le compte à rebours</h2>
          </div>

          <Countdown date={event.date} time={event.time} />
        </section>

        {viewer.kind === 'guest' && viewer.guest.source === 'liste' && (
          <section className="ev-sec">
            <Rsvp
              token={viewer.guest.token}
              current={viewer.guest.rsvp}
            />
          </section>
        )}

        <section className="ev-sec">
          <div className="ev-section-heading">
            <span className="ev-section-label">RESTEZ CONNECTÉS</span>
            <h2>Votre espace événement</h2>
          </div>

          <div className="quick">
            <Link href={`/e/${event.slug}/photos`}>
              <Icon name="photos" />
              <span>
                <b>Galerie</b>
                <small>
                  {photoCount} photo{photoCount > 1 ? 's' : ''} et vidéo
                  {photoCount > 1 ? 's' : ''}
                </small>
              </span>
            </Link>

            <Link href={`/e/${event.slug}/discussions`}>
              <Icon name="chat" />
              <span>
                <b>Discussions</b>
                <small>Échanger avec les invités</small>
              </span>
            </Link>

            <Link href={`/e/${event.slug}/livre-or`}>
              <Icon name="book" />
              <span>
                <b>Livre d'or</b>
                <small>
                  {bookCount} mot{bookCount > 1 ? 's' : ''} partagé
                  {bookCount > 1 ? 's' : ''}
                </small>
              </span>
            </Link>
          </div>
        </section>

        {(event.ceremonyPlace || event.receptionPlace) && (
          <section className="ev-sec">
            <div className="ev-section-heading">
              <span className="ev-section-label">RENDEZ-VOUS</span>
              <h2>Les lieux</h2>
              <p>Nous serons heureux de vous y retrouver.</p>
            </div>

            <div className="ev-places">
              {event.ceremonyPlace && (
                <a
                  className="place"
                  href={maps(event.ceremonyPlace)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="ic">
                    <Icon name="home" />
                  </span>

                  <span className="place-info">
                    <small>{bapteme ? 'CÉRÉMONIE' : 'CÉRÉMONIE'}</small>
                    <b>{event.ceremonyPlace}</b>
                    <span>Voir l'itinéraire →</span>
                  </span>
                </a>
              )}

              {event.receptionPlace && (
                <a
                  className="place"
                  href={maps(event.receptionPlace)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="ic">
                    <Icon name="ticket" />
                  </span>

                  <span className="place-info">
                    <small>{bapteme ? 'RÉCEPTION' : 'RÉCEPTION'}</small>
                    <b>{event.receptionPlace}</b>
                    <span>Voir l'itinéraire →</span>
                  </span>
                </a>
              )}
            </div>
          </section>
        )}

        {event.program.length > 0 && (
          <section className="ev-sec">
            <div className="ev-section-heading">
              <span className="ev-section-label">À NE PAS MANQUER</span>
              <h2>Le programme</h2>
              <p>Les moments importants de cette belle journée.</p>
            </div>

            <ol className="program ev-timeline">
              {event.program.map((item, index) => (
                <li key={`${item.time}-${index}`}>
                  <div className="timeline-marker">
                    <span>{String(index + 1).padStart(2, '0')}</span>
                  </div>

                  <div className="timeline-content">
                    <time>{hm(item.time)}</time>
                    <span>{item.label}</span>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        {event.story && (
          <section className="ev-sec ev-story">
            <div className="ev-section-heading">
              <span className="ev-section-label">QUELQUES MOTS</span>
              <h2>{bapteme ? 'La famille' : 'Notre histoire'}</h2>
            </div>

            <p>{event.story}</p>
            <span className="ev-decoration">✦</span>
          </section>
        )}

        <footer className="ev-footer">
          <span>✦</span>
          <p>Merci de partager ce moment avec nous.</p>
          <small>Créé avec Kanu</small>
        </footer>
      </main>
    </>
  );
}
