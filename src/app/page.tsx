import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { Ticket } from '@/components/Ticket';
import { PlanCards } from '@/components/PlanCards';
import { LogoutButton } from '@/components/LogoutButton';
import { currentUser, isAdmin } from '@/lib/auth';
import { qrSvg } from '@/lib/qr';
import { site, siteUrl } from '@/config/site';

// Image DÉTOURÉE (fond transparent, format PNG) à placer dans : public/images/maries.png
// Important : une photo .jpg garde son fond blanc, qui CACHE le cercle orange
// et fait des bords blancs. Il faut le fichier .png.
const PHOTO_MARIES = '/images/maries.png';

const FAQ = [
  {
    q: 'Mes invités doivent-ils installer une application ?',
    a: 'Non. Le lien s’ouvre directement dans le navigateur du téléphone, depuis WhatsApp, Facebook ou un SMS. Ceux qui le souhaitent peuvent ajouter l’espace à leur écran d’accueil, comme une application.',
  },
  {
    q: 'Et si le réseau ne passe pas le jour de la fête ?',
    a: 'Le téléphone de la personne qui contrôle l’entrée garde la liste des invités. Elle peut scanner les QR codes sans connexion, les entrées sont envoyées dès que le réseau revient.',
  },
  {
    q: 'Un invité n’a pas de smartphone, ou plus de batterie.',
    a: 'À l’entrée, on peut le retrouver par son nom dans la liste et valider son passage à la main.',
  },
  {
    q: 'Les photos perdent-elles en qualité ?',
    a: 'Non. Les originaux sont gardés tels quels. Une version allégée sert seulement à afficher la galerie rapidement sur les petits forfaits internet.',
  },
  {
    q: 'Combien de temps les souvenirs restent en ligne ?',
    a: 'La durée commence le jour de la fête, pas le jour du paiement : 30, 60 ou 90 jours selon l’offre. Vous êtes prévenus avant la suppression pour tout télécharger.',
  },
  {
    q: 'Comment je paie ?',
    a: 'Par Orange Money, Moov Money, Wave ou carte bancaire. Un seul paiement par fête, pas d’abonnement.',
  },
];

// Styles propres à cette page : entête blanc, grande image centrée, billet posé dessus
const styles = `
/* ---------- Entête blanc ---------- */
.lp-hero { background: #fff; color: var(--encre); padding-bottom: 80px; overflow: hidden; }
.lp-bar { display: flex; align-items: center; justify-content: space-between; gap: 16px; height: 72px; }
.lp-bar nav { display: flex; align-items: center; gap: 22px; }
.lp-bar nav a:not(.btn), .lp-bar nav .link-btn { color: var(--encre) !important; text-decoration: none; font-weight: 600; white-space: nowrap; }
.lp-bar nav a:not(.btn):hover { color: var(--orange-fonce) !important; }

/* ---------- Titre, texte et boutons (centrés) ---------- */
.lp-hero-text { position: relative; z-index: 3; text-align: center; padding-top: 40px; }   /* CENTRE le texte (et le garde devant le cercle) */
.lp-hero h1 {
  font-size: clamp(48px, 7.4vw, 108px);
  line-height: 0.92;
  letter-spacing: -0.045em;
  font-weight: 800;
  font-variation-settings: 'wdth' 80;
  max-width: 13ch;
  margin: 0 auto;                                          /* CENTRE le bloc du titre */
}
.lp-lead { font-size: 20px; max-width: 42ch; margin: 26px auto 0; color: var(--encre-2); }
.lp-actions { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; margin-top: 34px; } /* CENTRE les boutons */

/* ---------- Zone de l'image ----------
   Tout est calculé en proportion de la largeur de la zone (unité cqw = 1 % de la largeur),
   donc le téléphone affiche EXACTEMENT la même composition que l'ordinateur, en plus petit. */
.lp-stage {
  container-type: inline-size;  /* permet d'utiliser l'unité cqw à l'intérieur */
  display: flex;
  flex-direction: column;
  align-items: center;          /* CENTRE l'image et le billet horizontalement dans la page */
  margin-top: 40px;             /* espace au-dessus de l'image : plus petit = image plus haute */
}

.lp-photo {
  position: relative;
  margin: 0;
  width: min(820px, 100cqw);    /* TAILLE de l'image : 820 px sur ordinateur, toute la largeur sur téléphone */
}

/* Cercle orange derrière les mariés */
.lp-photo::before {
  content: '';
  position: absolute;
  left: 50%;                    /* CENTRE le cercle : son bord gauche au milieu… */
  transform: translateX(-50%);  /* …puis recul de la moitié de sa largeur = parfaitement centré */
  bottom: 0;                    /* le cercle est posé en bas de l'image */
  width: 78%;                   /* TAILLE du cercle : plus petit que les mariés, leurs têtes dépassent */
  aspect-ratio: 1;              /* largeur = hauteur, donc un vrai rond */
  border-radius: 50%;
  background: #ff8a3d;          /* couleur du cercle (var(--orange) pour l'orange vif) */
}

.lp-photo img {
  position: relative;
  z-index: 1;                   /* l'image passe DEVANT le cercle orange */
  display: block;
  width: 100%;                  /* l'image prend toute la largeur de .lp-photo */
  aspect-ratio: 704 / 668;      /* CADRAGE FIXE, presque carré : quelle que soit la photo utilisée,
                                   seul le centre (les mariés) est gardé, en grand */
  object-fit: cover;            /* remplit le cadre sans déformer (les bords vides sont coupés) */
  object-position: center bottom; /* CENTRE le cadrage sur les mariés, pieds en bas */
  margin: 0 auto;               /* CENTRE l'image dans son cadre */
}
/* Le fichier maries.png est recadré serré sur les mariés et centré sur eux. */

/* ---------- Billet orange posé sur l'image ----------
   Même proportions partout : 620 px de large pour une image de 820 px (75,6 %). */
.lp-ticket {
  container-type: inline-size;  /* les tailles du billet suivent sa largeur */
  position: relative;
  z-index: 2;                   /* le billet passe devant l'image */
  width: min(620px, 75.6cqw);   /* largeur du billet, en proportion de l'image */
  margin-top: max(-150px, -18.3cqw);  /* remonte le billet sur le bas de l'image, en proportion */
  filter: drop-shadow(0 22px 40px rgba(33, 20, 13, .28));
}
/* Le billet garde sa forme d'ordinateur (prénoms à gauche, QR code à droite) même sur téléphone.
   Chaque taille = taille d'ordinateur ÷ 6,2 (car 620 px = 100cqw). */
.lp-ticket .ticket {
  grid-template-columns: 1fr auto;
  border-radius: 4.5cqw;
  --stub: 37.1cqw;
  --notch: 3.5cqw;
  -webkit-mask:
    radial-gradient(circle var(--notch) at calc(100% - var(--stub)) 0, #0000 98%, #000) top / 100% 51% no-repeat,
    radial-gradient(circle var(--notch) at calc(100% - var(--stub)) 100%, #0000 98%, #000) bottom / 100% 51% no-repeat;
  mask:
    radial-gradient(circle var(--notch) at calc(100% - var(--stub)) 0, #0000 98%, #000) top / 100% 51% no-repeat,
    radial-gradient(circle var(--notch) at calc(100% - var(--stub)) 100%, #0000 98%, #000) bottom / 100% 51% no-repeat;
}
.lp-ticket .ticket-main { padding: 5.8cqw; gap: 4.5cqw; min-height: 61cqw; }
.lp-ticket .ticket-kind { font-size: 2.6cqw; }
.lp-ticket .ticket-names { font-size: 13.5cqw; }
.lp-ticket .ticket-meta { font-size: 2.6cqw; }
.lp-ticket .ticket-meta b { font-size: 2.9cqw; }
.lp-ticket .ticket-stub {
  width: 37.1cqw;
  padding: 5.2cqw 4.2cqw;
  flex-direction: column;
  align-items: stretch;
  border-top: 0;
  border-left: 2px dashed rgba(255, 255, 255, 0.55);
}
.lp-ticket .ticket-qr { width: auto; padding: 1.9cqw; border-radius: 2.3cqw; }
.lp-ticket .ticket-guest { font-size: 2.4cqw; }
.lp-ticket .ticket-guest b { font-size: 2.9cqw; }

/* ---------- Rubrique « Espace de discussion » ---------- */
.lp-chat { display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 64px; align-items: center; }
.lp-chat h2 { max-width: 14ch; }
.lp-chat-lead { font-size: 19px; color: var(--encre-2); margin-top: 18px; max-width: 46ch; }
.lp-chat-steps { list-style: none; padding: 0; margin: 32px 0 0; counter-reset: c; display: grid; gap: 22px; }
.lp-chat-steps li { counter-increment: c; display: grid; grid-template-columns: 52px 1fr; gap: 14px; align-items: start; }
.lp-chat-steps li::before {
  content: counter(c);
  width: 44px; height: 44px; border-radius: 999px;
  display: grid; place-items: center;
  background: var(--orange); color: #fff;
  font-family: var(--display); font-weight: 800; font-size: 22px;
}
.lp-chat-steps b { display: block; font-size: 18px; margin-bottom: 2px; }
.lp-chat-steps p { color: var(--encre-2); }
.lp-chat-uses { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 28px; }
.lp-chat-uses span { background: var(--sable); border-radius: 999px; padding: 7px 14px; font-weight: 650; font-size: 15px; }

/* Téléphone dessiné en CSS (aperçu des groupes) */
.lp-phone {
  justify-self: center;
  width: min(380px, 100%);
  border: 10px solid var(--encre);
  border-radius: 40px;
  background: #fff;
  overflow: hidden;
  box-shadow: 0 30px 60px rgba(33, 20, 13, .18);
}
.lp-phone-top { padding: 18px 20px 10px; font-family: var(--display); font-weight: 800; font-size: 26px; letter-spacing: -0.02em; border-bottom: 1px solid var(--trait); }
.lp-phone-row { display: flex; gap: 12px; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--trait); }
.lp-phone-row:last-child { border-bottom: 0; }
.lp-av { width: 46px; height: 46px; flex: none; border-radius: 999px; display: grid; place-items: center; color: #fff; font-family: var(--display); font-weight: 800; font-size: 16px; }
.lp-phone-row .t { flex: 1; min-width: 0; }
.lp-phone-row .t b { display: block; font-size: 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lp-phone-row .t span { display: block; font-size: 14px; color: var(--encre-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lp-phone-row .m { display: grid; justify-items: end; gap: 4px; font-size: 12px; color: var(--encre-3); }
.lp-phone-row .m .new { color: var(--orange-fonce); font-weight: 700; }
.lp-phone-row .badge { min-width: 20px; height: 20px; padding: 0 6px; border-radius: 999px; background: var(--orange); color: #fff; font-size: 12px; font-weight: 700; display: grid; place-items: center; }
.lp-phone-note { background: #fff6ef; padding: 14px 16px; font-size: 13.5px; color: var(--encre-2); text-align: center; }

/* ---------- Téléphone ---------- */
@media (max-width: 900px) {
  .lp-chat { grid-template-columns: 1fr; gap: 40px; }
  .lp-hero { padding-bottom: 56px; }
  .lp-bar { height: 60px; }
  .lp-bar nav { gap: 14px; font-size: 15px; }
  .lp-bar .hide-m { display: none; }
  .lp-hero-text { padding-top: 20px; }
  .lp-hero h1 { font-size: 52px; }
  .lp-lead { font-size: 18px; margin-top: 18px; }
  .lp-actions { margin-top: 26px; }
  .lp-actions .btn { flex: 1; }
  .lp-stage { margin-top: 24px; }   /* image plus haute sur téléphone */
}
`;

export default async function Home() {
  const qr = await qrSvg(`${siteUrl()}/invitation/exemple`);
  const user = await currentUser();

  return (
    <>
      <style>{styles}</style>

      <header className="lp-hero">
        {/* Barre du haut : logo à gauche, « Se connecter » à droite */}
        <div className="wrap lp-bar">
          <Logo />
          <nav aria-label="Navigation principale">
            {user ? (
              <>
                {isAdmin(user) && (
                  <Link href="/admin" className="hide-m">
                    Administration
                  </Link>
                )}
                <Link href="/boutique">Boutique</Link>
                <Link href="/tableau">Mes espaces</Link>
                <span className="hide-m">
                  <LogoutButton />
                </span>
              </>
            ) : (
              <Link href="/connexion" className="btn ghost sm">
                Se connecter
              </Link>
            )}
          </nav>
        </div>

        <div className="wrap">
          {/* Titre, texte et boutons : centrés par .lp-hero-text */}
          <div className="lp-hero-text">
            <h1>Toute la fête dans un seul lien.</h1>
            <p className="lp-lead">
              Mariage ou baptême : vos invités reçoivent leur invitation sur WhatsApp, présentent leur QR code à
              l’entrée et partagent leurs photos, vidéos et vocaux au même endroit. Sans application à installer.
            </p>
            <div className="lp-actions">
              <Link href="/creer" className="btn">
                Créer mon espace
              </Link>
              <Link href="#offres" className="btn ghost">
                Voir les offres
              </Link>
            </div>
          </div>
        </div>

        {/* .lp-stage est EN DEHORS de .wrap : l'image n'est plus limitée à la largeur du texte
            et peut prendre tout l'écran. Il CENTRE l'image et le billet. */}
        <div className="lp-stage">
            {/* .lp-photo fixe la TAILLE de l'image et dessine le cercle orange derrière */}
            <figure className="lp-photo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={PHOTO_MARIES} alt="Les mariés le jour de leur mariage" />
            </figure>

            {/* Billet orange avec le QR code, posé sur le bas de l'image */}
            <div className="lp-ticket">
              <Ticket
                kind="Mariage"
                names={['Awa', '& Ibrahim']}
                date="Samedi 19 décembre 2026, 16 h"
                place="Hôtel Salam, Bamako"
                qr={<div dangerouslySetInnerHTML={{ __html: qr }} />}
                guestName="Famille Coulibaly"
                guestLine="4 personnes, cérémonie et dîner"
              />
            </div>
        </div>
      </header>

      <main>
        <section className="band" id="fonctionnement">
          <div className="wrap">
            <div className="section-head">
              <h2>De l’invitation au dernier souvenir</h2>
              <p>Vous préparez l’espace une fois. Vos proches font le reste depuis leur téléphone.</p>
            </div>
            <ol className="steps">
              <li>
                <h3>Créez l’espace</h3>
                <p>Noms, date, lieux et programme. Dix minutes suffisent, vous pouvez tout modifier ensuite.</p>
              </li>
              <li>
                <h3>Envoyez les invitations</h3>
                <p>
                  Un lien et un code à coller dans vos groupes WhatsApp, ou une invitation personnelle avec QR code
                  pour chaque famille.
                </p>
              </li>
              <li>
                <h3>Contrôlez l’entrée</h3>
                <p>
                  Un proche scanne les QR codes avec son téléphone à l’entrée du dîner. Une invitation ne sert
                  qu’une fois.
                </p>
              </li>
              <li>
                <h3>Gardez tout</h3>
                <p>Photos et vidéos en qualité originale, livre d’or écrit et vocal, téléchargés en une fois.</p>
              </li>
            </ol>
          </div>
        </section>

        {/* ---------- Rubrique : espace de discussion entre invités ---------- */}
        <section className="section" id="discussions">
          <div className="wrap lp-chat">
            <div>
              <h2>Un espace pour s’organiser entre invités</h2>
              <p className="lp-chat-lead">
                Au Mali, un mariage se prépare à plusieurs : les uniformes à coudre, les cotisations, le cortège, la
                cuisine. Kanu a son propre espace de discussion, avec des groupes comme sur WhatsApp, réservés aux
                invités du mariage.
              </p>
              <ol className="lp-chat-steps">
                <li>
                  <div>
                    <b>Les mariés choisissent un administrateur</b>
                    <p>Un frère, une cousine, une amie de confiance : ils lui donnent le droit de créer des groupes.</p>
                  </div>
                </li>
                <li>
                  <div>
                    <b>Il crée les groupes et choisit qui y entre</b>
                    <p>Chaque groupe a son nom et ses membres. Il ajoute les invités qu’il veut, dans le groupe qu’il veut.</p>
                  </div>
                </li>
                <li>
                  <div>
                    <b>Les invités s’organisent avant le jour J</b>
                    <p>Ils discutent comme sur WhatsApp. Les mariés peuvent voir tous les groupes.</p>
                  </div>
                </li>
              </ol>
              <div className="lp-chat-uses" aria-label="Exemples de groupes">
                <span>Uniformes</span>
                <span>Cotisations</span>
                <span>Cortège</span>
                <span>Cuisine</span>
                <span>Décoration</span>
              </div>
            </div>

            {/* Aperçu : un téléphone avec la liste des groupes */}
            <div className="lp-phone" aria-hidden="true">
              <div className="lp-phone-top">Discussions</div>
              <div className="lp-phone-row">
                <span className="lp-av" style={{ background: '#FF5A00' }}>UC</span>
                <span className="t">
                  <b>Uniforme des cousines</b>
                  <span>Aminata : le bazin est à 7 500 le mètre</span>
                </span>
                <span className="m">
                  <span className="new">18:42</span>
                  <span className="badge">3</span>
                </span>
              </div>
              <div className="lp-phone-row">
                <span className="lp-av" style={{ background: '#21140D' }}>CT</span>
                <span className="t">
                  <b>Cotisation famille Traoré</b>
                  <span>Moussa : j’ai envoyé ma part par Orange Money</span>
                </span>
                <span className="m">
                  <span className="new">17:10</span>
                  <span className="badge">1</span>
                </span>
              </div>
              <div className="lp-phone-row">
                <span className="lp-av" style={{ background: '#C2410C' }}>CS</span>
                <span className="t">
                  <b>Cortège du samedi</b>
                  <span>Vous : départ de Badalabougou à 14 h</span>
                </span>
                <span className="m">
                  <span>Hier</span>
                </span>
              </div>
              <div className="lp-phone-row">
                <span className="lp-av" style={{ background: '#0F766E' }}>CR</span>
                <span className="t">
                  <b>Cuisine et repas</b>
                  <span>Fanta : il faut encore 2 sacs de riz</span>
                </span>
                <span className="m">
                  <span>Hier</span>
                </span>
              </div>
              <div className="lp-phone-note">Seuls les invités ajoutés voient un groupe.</div>
            </div>
          </div>
        </section>

        <section className="section" id="offres">
          <div className="wrap">
            <div className="section-head">
              <h2>Un paiement par fête</h2>
              <p>Pas d’abonnement. Choisissez selon le nombre d’invités et ce dont vous avez besoin le jour J.</p>
            </div>
            <PlanCards />
          </div>
        </section>

        <section className="section" style={{ paddingTop: 0 }}>
          <div className="wrap shop-teaser">
            <div>
              <h2>Et tout ce qu’il faut pour la fête</h2>
              <p className="muted" style={{ fontSize: 19, marginTop: 16, maxWidth: '38ch' }}>
                Eau, sacs de riz, chaises, bâches, vaisselle, sono : commandez directement chez nous depuis votre
                téléphone. Nous livrons, et vous payez à la livraison.
              </p>
              <div className="row" style={{ marginTop: 24 }}>
                <Link href="/boutique" className="btn">
                  Voir la boutique
                </Link>
              </div>
            </div>
            <ul className="shop-words" aria-label="Exemples de produits">
              {['Eau en sachet', 'Riz 50 kg', 'Chaises', 'Bâches', 'Marmites', 'Sono', 'Groupe électrogène', 'Décoration'].map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="section" style={{ paddingTop: 0 }}>
          <div className="wrap faq-grid">
            <h2 style={{ maxWidth: '9ch' }}>Les questions qu’on nous pose</h2>
            <div className="faq">
              {FAQ.map((f) => (
                <details key={f.q}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="band" style={{ padding: '72px 0' }}>
          <div className="wrap row between" style={{ gap: 28 }}>
            <h2 style={{ maxWidth: '16ch' }}>Votre date approche ? Ouvrez l’espace aujourd’hui.</h2>
            <Link href="/creer" className="btn white">
              Créer mon espace
            </Link>
          </div>
        </section>
      </main>

      <footer className="foot">
        <div className="wrap">
          <Logo />
          <span>
            {site.city}, {site.country}. Assistance au {site.supportPhone}.
          </span>
          <Link href="/rejoindre">J’ai reçu un code d’invitation</Link>
        </div>
      </footer>
    </>
  );
}