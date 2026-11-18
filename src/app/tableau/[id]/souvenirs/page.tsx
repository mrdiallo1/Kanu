import Link from 'next/link';
import { owned } from '@/lib/page';
import { feature } from '@/lib/access';
import { planExport, rootFolder } from '@/lib/export';
import { bytes } from '@/lib/format';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { event } = await owned(params);

  if (!feature(event, 'exportComplet')) {
    return (
      <div className="panel sand stack" style={{ ['--gap' as string]: '12px', maxWidth: 680 }}>
        <h3>Téléchargement complet</h3>
        <p>
          Avec l’offre Essentiel, chaque photo et vidéo se télécharge une par une depuis la galerie, en qualité originale.
          Le téléchargement de tous les souvenirs en une fois fait partie des offres Classique et Prestige.
        </p>
        <div>
          <Link href={`/tableau/${event.id}/galerie`} className="btn ghost sm">
            Aller à la galerie
          </Link>
        </div>
      </div>
    );
  }

  const plan = await planExport(event);
  const root = rootFolder(event);
  const many = plan.parts.length > 1;

  return (
    <div className="stack" style={{ ['--gap' as string]: '32px' }}>
      <div>
        <h2 style={{ fontSize: 36 }}>Télécharger tous mes souvenirs</h2>
        <p className="muted" style={{ maxWidth: '62ch', marginTop: 8 }}>
          {bytes(plan.total)} de photos, vidéos et vocaux en qualité originale.{' '}
          {many
            ? `L’ensemble est découpé en ${plan.parts.length} archives de 4 Go au plus, plus faciles à télécharger. Téléchargez-les de préférence en Wi-Fi, depuis un ordinateur, puis copiez-les sur une clé USB ou un disque dur.`
            : 'Téléchargez de préférence en Wi-Fi, puis copiez l’archive sur une clé USB ou un disque dur.'}
        </p>
      </div>

      <div className="stack" style={{ ['--gap' as string]: '12px' }}>
        {plan.parts.map((p) => (
          <div key={p.index} className="panel row between">
            <div>
              <b style={{ fontSize: 19 }}>{many ? `Archive ${p.index} sur ${plan.parts.length}` : 'Archive complète'}</b>
              <p className="small muted">
                {p.media.length} fichiers, {bytes(p.size)}
                {p.withBook ? ', avec le livre d’or et les informations de la fête' : ''}
              </p>
            </div>
            <a className="btn" href={`/api/espaces/${event.id}/export?partie=${p.index}`}>
              Télécharger
            </a>
          </div>
        ))}
      </div>

      <div className="cols" style={{ ['--n' as string]: 2 }}>
        <div className="panel">
          <h3>Ce que contient l’archive</h3>
          <pre className="small" style={{ margin: 0, lineHeight: 1.7, fontFamily: 'inherit', whiteSpace: 'pre-wrap' }}>
            {`${root}/
  PHOTOS_ORIGINALES/
  VIDEOS_ORIGINALES/
  MESSAGES_VOCAUX/
  LIVRE_D_OR/${feature(event, 'livreOrPdf') ? '\n    livre_or.pdf' : ''}${feature(event, 'miniSite') ? '\n    index.html  (mini-site, s’ouvre sans Internet)\n    audios/' : ''}
  INFORMATIONS/details.txt`}
          </pre>
        </div>
        <div className="panel">
          <h3>Noms des fichiers</h3>
          <p className="muted">
            Chaque fichier garde le nom de son auteur et la date d’envoi, par exemple 001_awa_traore_2026-12-19.jpg. Les formats
            d’origine sont conservés (JPG, HEIC, MP4, MOV…).
          </p>
        </div>
      </div>
    </div>
  );
}
