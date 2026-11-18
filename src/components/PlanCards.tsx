import Link from 'next/link';
import { FEATURE_LABELS, PLANS, PLAN_ORDER } from '@/config/plans';

export function PlanCards() {
  return (
    <div className="plans">
      {PLAN_ORDER.map((id) => {
        const p = PLANS[id];
        const pick = id === 'classique';
        return (
          <article key={id} className={`plan${pick ? ' pick' : ''}`}>
            <div className="stack" style={{ ['--gap' as string]: '8px' }}>
              <h3>{p.name}</h3>
              <p>{p.pitch}</p>
            </div>
            <div className="price">
              {new Intl.NumberFormat('fr-FR').format(p.price).replace(/ /g, ' ')}
              <small>FCFA</small>
            </div>
            <div className="facts">
              <span>
                <b>{p.maxGuests}</b>invités
              </span>
              <span>
                <b>{p.storageGb} Go</b>stockage
              </span>
              <span>
                <b>{p.retentionDays} j</b>après la fête
              </span>
            </div>
            <ul>
              {p.features.map((f) => (
                <li key={f}>{FEATURE_LABELS[f]}</li>
              ))}
            </ul>
            <Link href={`/creer?offre=${id}`} className={`btn${pick ? '' : ' ghost'}`}>
              Choisir {p.name}
            </Link>
          </article>
        );
      })}
    </div>
  );
}
